#!/bin/bash
#
# This script packages your project into a solution distributable that can be
# used as an input to the solution builder validation pipeline.
#
# Important notes and prereq's:
#   1. The initialize-repo.sh script must have been run in order for this script to
#      function properly.
#   2. This script should be run from the repo's /deployment folder.
#
# This script will perform the following tasks:
#   1. Remove any old dist files from previous runs.
#   2. Install dependencies for the cdk-solution-helper; responsible for
#      converting standard 'cdk synth' output into solution assets.
#   3. Build and synthesize your CDK project.
#   4. Run the cdk-solution-helper on template outputs and organize
#      those outputs into the /global-s3-assets folder.
#   5. Organize source code artifacts into the /regional-s3-assets folder.
#   6. Remove any temporary files used for staging.
#
# Parameters:
#  - source-bucket-base-name: Name for the S3 bucket location where the template will source the Lambda
#    code from. The template will append '-[region_name]' to this bucket name.
#    For example: ./build-s3-dist.sh solutions v1.0.0
#    The template will then expect the source code to be located in the solutions-[region_name] bucket
#  - solution-name: name of the solution for consistency
#  - version-code: version of the package
#-----------------------
# Formatting
bold=$(tput bold)
normal=$(tput sgr0)
#------------------------------------------------------------------------------
# SETTINGS
#------------------------------------------------------------------------------
template_format="json"
run_helper="true"

# run_helper is false for yaml - not supported
[[ $template_format == "yaml" ]] && {
    run_helper="false"
    echo "${bold}Solution_helper disabled:${normal} template format is yaml"
}

#------------------------------------------------------------------------------
# DISABLE OVERRIDE WARNINGS
#------------------------------------------------------------------------------
# Use with care: disables the warning for overridden properties on 
# AWS Solutions Constructs
export overrideWarningsEnabled=false

#------------------------------------------------------------------------------
# Build Functions 
#------------------------------------------------------------------------------
# Echo, execute, and check the return code for a command. Exit if rc > 0
# ex. do_cmd npm run build
usage() 
{
    echo "Usage: $0 bucket solution-name version"
    echo "Please provide the base source bucket name, trademarked solution name, version." 
    echo "For example: ./build-s3-dist.sh mybucket my-solution v1.0.0"
    exit 1 
}

do_cmd() 
{
    echo "------ EXEC $*"
    $*
    rc=$?
    if [ $rc -gt 0 ]
    then
            echo "Aborted - rc=$rc"
            exit $rc
    fi
}

if command -v poetry >/dev/null 2>&1; then
    export POETRY_COMMAND="poetry"
elif [ -n "$POETRY_HOME" ] && [ -x "$POETRY_HOME/bin/poetry" ]; then
    export POETRY_COMMAND="$POETRY_HOME/bin/poetry"
else
    echo "Poetry is not available. Aborting script." >&2
    exit 1
fi

sedi()
{
    # cross-platform for sed -i
    sed -i $* 2>/dev/null || sed -i "" $*
}

t() {
  # count elapsed time for a command
  local start=$(date +%s)
  $@
  local exit_code=$?
  echo >&2 "[$@] took ~$(($(date +%s)-${start})) seconds. exited with ${exit_code}"
  return $exit_code
}

# use sed to perform token replacement
# ex. do_replace myfile.json %%VERSION%% v1.1.1
do_replace() 
{
    replace="s/$2/$3/g"
    file=$1
    do_cmd sedi $replace $file
}

create_template_json() 
{
    # Run 'cdk synth' to generate raw solution outputs
    t do_cmd npx cdk synth --output=$staging_dist_dir

    # Remove unnecessary output files
    do_cmd cd $staging_dist_dir
    # ignore return code - can be non-zero if any of these does not exist
    rm tree.json manifest.json cdk.out

    # Move outputs from staging to template_dist_dir
    echo "Move outputs from staging to template_dist_dir"
    do_cmd mv $staging_dist_dir/*.template.json $template_dist_dir/

    # Rename all *.template.json files to *.template
    echo "Rename all *.template.json to *.template"
    echo "copy templates and rename"
    for f in $template_dist_dir/*.template.json; do
        mv -- "$f" "${f%.template.json}.template"
    done
}

create_template_yaml() 
{
    # Assumes current working directory is where the CDK is defined
    # Output YAML - this is currently the only way to do this for multiple templates
    maxrc=0
    for template in `cdk list`; do
        echo Create template $template
        npx cdk synth $template > ${template_dist_dir}/${template}.template
        if [[ $? > $maxrc ]]; then
            maxrc=$?
        fi
    done
}

cleanup_temporary_generted_files()
{
    echo "------------------------------------------------------------------------------"
    echo "${bold}[Cleanup] Remove temporary files${normal}"
    echo "------------------------------------------------------------------------------"

    # Delete generated files: CDK Consctruct typescript transcompiled generted files
    do_cmd cd $source_dir/constructs
    do_cmd npm run cleanup:tsc

    # Delete the temporary /staging folder
    do_cmd rm -rf $staging_dist_dir
}

fn_exists()
{
    exists=`LC_ALL=C type $1`
    return $?
}

#------------------------------------------------------------------------------
# INITIALIZATION
#------------------------------------------------------------------------------
# solution_config must exist in the deployment folder (same folder as this 
# file) . It is the definitive source for solution ID, name, and trademarked 
# name.
#
# Example:
#
# SOLUTION_ID='SO0111'
# SOLUTION_NAME='AWS Security Hub Automated Response & Remediation'
# SOLUTION_TRADEMARKEDNAME='aws-security-hub-automated-response-and-remediation'
# SOLUTION_VERSION='v1.1.1' # optional
if [[ -e './solution_config' ]]; then
    source ./solution_config
else
    echo "solution_config is missing from the solution root."
    exit 1
fi

if [[ -z $SOLUTION_ID ]]; then
    echo "SOLUTION_ID is missing from ../solution_config"
    exit 1
else
    export SOLUTION_ID
fi

if [[ -z $SOLUTION_NAME ]]; then
    echo "SOLUTION_NAME is missing from ../solution_config"
    exit 1
else
    export SOLUTION_NAME
fi

if [[ -z $SOLUTION_TRADEMARKEDNAME ]]; then
    echo "SOLUTION_TRADEMARKEDNAME is missing from ../solution_config"
    exit 1
else 
    export SOLUTION_TRADEMARKEDNAME
fi


#------------------------------------------------------------------------------
# Validate command line parameters
#------------------------------------------------------------------------------
# Validate command line input - must provide bucket
[[ -z $1 ]] && { usage; exit 1; } || { SOLUTION_BUCKET=$1; }

# Environmental variables for use in CDK
export DIST_OUTPUT_BUCKET=$SOLUTION_BUCKET

# Version from the command line is definitive. Otherwise, use, in order of precedence:
# - SOLUTION_VERSION from solution_config
# - version.txt
#
# Note: Solutions Pipeline sends bucket, name, version. Command line expects bucket, version
# if there is a 3rd parm then version is $3, else $2
#
# If confused, use build-s3-dist.sh <bucket> <version>
if [ ! -z $3 ]; then
    export VERSION="$3"
else
    export VERSION=$(git describe --tags --exact-match || { [ -n "$BRANCH_NAME" ] && echo "$BRANCH_NAME"; } || echo v0.0.0)
fi

#-----------------------------------------------------------------------------------
# Get reference for all important folders
#-----------------------------------------------------------------------------------
template_dir="$PWD"
staging_dist_dir="$template_dir/staging"
template_dist_dir="$template_dir/global-s3-assets"
build_dist_dir="$template_dir/regional-s3-assets"
source_dir="$template_dir/../source"
s3_list_objects_dir="$template_dir/../deployment/ecr/clo-s3-list-objects"

echo "------------------------------------------------------------------------------"
echo "${bold}[Init] Remove any old dist files from previous runs${normal}"
echo "------------------------------------------------------------------------------"

do_cmd rm -rf $template_dist_dir
do_cmd mkdir -p $template_dist_dir
do_cmd rm -rf $build_dist_dir
do_cmd mkdir -p $build_dist_dir
do_cmd rm -rf $staging_dist_dir
do_cmd mkdir -p $staging_dist_dir

echo "{\"version\": \"$VERSION\"}" > $template_dist_dir/version

echo "------------------------------------------------------------------------------"
echo "${bold}[Init] Install dependencies for the cdk-solution-helper${normal}"
echo "------------------------------------------------------------------------------"

do_cmd cd $template_dir/cdk-solution-helper
do_cmd npm install

if [ ! -e $source_dir/constructs/lambda/plugin/standard/assets/GeoLite2-City.mmdb ]; then
  echo "------------------------------------------------------------------------------"
  echo "${bold}[Download] Download MaxMind database${normal}"
  echo "------------------------------------------------------------------------------"
  do_cmd cd $source_dir/constructs
  do_cmd curl --create-dirs -o lambda/plugin/standard/assets/GeoLite2-City.mmdb https://aws-gcr-solutions-assets.s3.amazonaws.com/maxmind/GeoLite2-City.mmdb
fi

echo "------------------------------------------------------------------------------"
echo "${bold}[Synth] CDK Project${normal}"
echo "------------------------------------------------------------------------------"

# Install and build web console asset
# This is done in run-all-tests.sh
# do_cmd cd $source_dir/portal
# do_cmd npm install

# export PATH=$(npm bin):$PATH
# do_cmd npm run build


# Install the global aws-cdk package
# Note: do not install using global (-g) option. This makes build-s3-dist.sh difficult
# for customers and developers to use, as it globally changes their environment.
do_cmd cd $source_dir/constructs
t do_cmd npm install

# Add local install to PATH
export PATH=$(npm bin):$PATH
t do_cmd npm run build       # build javascript from typescript to validate the code
                           # cdk synth doesn't always detect issues in the typescript
                           # and may succeed using old build files. This ensures we
                           # have fresh javascript from a successful build


echo "------------------------------------------------------------------------------"
echo "[Install] Install dependencies for Lambda functions & layers"
echo "------------------------------------------------------------------------------"

do_cmd cd $source_dir/constructs/lib/microbatch/main/services/lambda/layer
"$POETRY_COMMAND" export --format requirements.txt --output requirements-boto3.txt --without-hashes --only boto3
"$POETRY_COMMAND" export --format requirements.txt --output requirements-pyarrow.txt --without-hashes --only pyarrow
"$POETRY_COMMAND" export --format requirements.txt --output requirements-utils.txt --without-hashes --only utils
"$POETRY_COMMAND" export --format requirements.txt --output requirements-enrichment.txt --without-hashes --only enrichment

lambda_paths=(
    "common-lib"
    "api/app_log_ingestion"
    "api/app_pipeline"
    "api/cluster"
    "api/log_source"
    "plugin/standard"
    "api/pipeline_ingestion_flow"
)

base_lambda_dir="$source_dir/constructs/lambda"
for path in "${lambda_paths[@]}"; do
    full_path="$base_lambda_dir/$path"
    do_cmd cd "$full_path"
    "$POETRY_COMMAND" export --format requirements.txt --output requirements.txt --without-hashes --without dev
done


echo "------------------------------------------------------------------------------"
echo "${bold}[Create] Templates${normal}"
echo "------------------------------------------------------------------------------"
do_cmd cd $source_dir/constructs
if fn_exists create_template_${template_format}; then
    t create_template_${template_format}
else
    echo "Invalid setting for \$template_format: $template_format"
    exit 255
fi

echo "------------------------------------------------------------------------------"
echo "${bold}[Packing] Template artifacts${normal}"
echo "------------------------------------------------------------------------------"

# Run the helper to clean-up the templates and remove unnecessary CDK elements
echo "Run the helper to clean-up the templates and remove unnecessary CDK elements"
[[ $run_helper == "true" ]] && {
    echo "node $template_dir/cdk-solution-helper/index"
    node $template_dir/cdk-solution-helper/index
    if [ "$?" = "1" ]; then
    	echo "(cdk-solution-helper) ERROR: there is likely output above." 1>&2
    	exit 1
    fi
} || echo "${bold}Solution Helper skipped: ${normal}run_helper=false"

# Find and replace bucket_name, solution_name, and version
echo "Find and replace bucket_name, solution_name, and version"
cd $template_dist_dir
do_replace "*.template" %%BUCKET_NAME%% ${SOLUTION_BUCKET}
do_replace "*.template" %%SOLUTION_NAME%% ${SOLUTION_TRADEMARKEDNAME}
do_replace "*.template" %%VERSION%% ${VERSION}

echo "------------------------------------------------------------------------------"
echo "${bold}[Packing] Source code artifacts${normal}"
echo "------------------------------------------------------------------------------"

# General cleanup of node_modules files
echo "find $staging_dist_dir -iname "node_modules" -type d -exec rm -rf "{}" \; 2> /dev/null"
find $staging_dist_dir -iname "node_modules" -type d -exec rm -rf "{}" \; 2> /dev/null

# ... For each asset.* source code artifact in the temporary /staging folder...
cd $staging_dist_dir
for d in `find . -mindepth 1 -maxdepth 1 -type d`; do

    # pfname = asset.<key-name>
    pfname="$(basename -- $d)"

    # zip folder
    echo "zip -rq $pfname.zip $pfname"
    cd $pfname
    zip -rq $pfname.zip *
    mv $pfname.zip ../
    cd ..

    # Remove the old, unzipped artifact from /staging
    echo "rm -rf $pfname"
    rm -rf $pfname

    # ... repeat until all source code artifacts are zipped and placed in the /staging
done


# ... For each asset.*.zip code artifact in the temporary /staging folder...
cd $staging_dist_dir
for f in `find . -iname \*.zip`; do
    # Rename the artifact, removing the period for handler compatibility
    # pfname = asset.<key-name>.zip
    pfname="$(basename -- $f)"
    echo $pfname
    # fname = <key-name>.zip
    fname="$(echo $pfname | sed -e 's/asset\.//g')"
    mv $pfname $fname

    # Copy the zipped artifact from /staging to /regional-s3-assets
    echo "cp $fname $build_dist_dir"
    cp $fname $build_dist_dir

    # Remove the old, zipped artifact from /staging
    echo "rm $fname"
    rm $fname
done

# cleanup temporary generated files that are not needed for later stages of the build pipeline
cleanup_temporary_generted_files

# Return to original directory from when we started the build
cd $template_dir

# build ecr
echo "Run s3_list_objects_dir/build.sh"
t do_cmd $s3_list_objects_dir/build.sh

# cleanup requirement.txt files 
paths=(
    "$source_dir/constructs/lib/microbatch/main/services/lambda/layer"
    "$source_dir/constructs/lambda/common-lib"
    "$source_dir/constructs/lambda/api/app_log_ingestion"
    "$source_dir/constructs/lambda/api/app_pipeline"
    "$source_dir/constructs/lambda/api/cluster"
    "$source_dir/constructs/lambda/api/log_source"
    "$source_dir/constructs/lambda/plugin/standard"
    "$source_dir/constructs/lambda/api/pipeline_ingestion_flow"
)
for path in "${paths[@]}"; do
    rm $path/requirements*.txt
done
