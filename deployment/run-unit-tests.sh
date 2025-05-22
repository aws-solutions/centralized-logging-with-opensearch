#!/bin/bash
#
# This script runs all tests for the root CDK project, as well as any microservices, Lambda functions, or dependency
# source code packages. These include unit tests, integration tests, and snapshot tests.
#
# This script is called by the ../initialize-repo.sh file and the buildspec.yml file. It is important that this script
# be tested and validated to ensure that all available test fixtures are run.
#
# The if/then blocks are for error handling. They will cause the script to stop executing if an error is thrown from the
# node process running the test case(s). Removing them or not using them for additional calls with result in the
# script continuing to execute despite an error being thrown.

[ "$DEBUG" == 'true' ] && set -x
set -e

# Check if poetry is available in the shell
if command -v poetry >/dev/null 2>&1; then
    export POETRY_COMMAND="poetry"
elif [ -n "$POETRY_HOME" ] && [ -x "$POETRY_HOME/bin/poetry" ]; then
    export POETRY_COMMAND="$POETRY_HOME/bin/poetry"
else
    echo "Poetry is not available. Aborting script." >&2
    exit 1
fi


t() {
  # count elapsed time for a command
  local start=$(date +%s)
  $@
  local exit_code=$?
  echo >&2 "[$@] took ~$(($(date +%s)-${start})) seconds. exited with ${exit_code}"
  return $exit_code
}


recreate_symbolic_link() {
	source=$1
	target=$2

	echo "------------------------------------------------------------------------------"
	echo "[Test] Create symbolic link, source: ${source}, target: ${target}"
	echo "------------------------------------------------------------------------------"
	
	if [ ! -d $(dirname "$target") ]; then
		echo 'Create target dir: '$(dirname "$target")'.'
		mkdir -p $(dirname "$target")
	fi

	if [ -h $target ]; then
        echo "Removing existing symlink: ${target}."
        unlink $target
	else
		echo "Removing existing directory: ${target}."
		rm -rf $target
	fi

	if [ -e $source ]; then
		echo "Check source: ${source} exists."
	fi

	echo "Creating symlink: source -> ${source}, target -> ${target}."
	ln -s $source $target
}

run_python_test() {
	local component_path=$1
	local component_name=$2

	echo "------------------------------------------------------------------------------"
	echo "[Test] Run python unit test with coverage for $component_path $component_name"
	echo "------------------------------------------------------------------------------"
	cd $component_path

	echo "Initiating virtual environment"

	"$POETRY_COMMAND" install
	source $("$POETRY_COMMAND" env info --path)/bin/activate

    echo "Installing python packages"
    # install test dependencies in the python virtual environment
	t pip install --upgrade pip
	t pip install --upgrade pytest-xdist
	t pip3 install -e $source_dir/constructs/lambda/common-lib

	# setup coverage report path
	mkdir -p $source_dir/tests/coverage-reports
	coverage_report_path=$source_dir/tests/coverage-reports/$component_name.coverage.xml
	echo "coverage report path set to $coverage_report_path"

	# Use -vv for debugging
	python3 -m pytest --cov --cov-report=term-missing --cov-report "xml:$coverage_report_path"

    # The pytest --cov with its parameters and .coveragerc generates a xml cov-report with `coverage/sources` list
    # with absolute path for the source directories. To avoid dependencies of tools (such as SonarQube) on different
    # absolute paths for source directories, this substitution is used to convert each absolute source directory
    # path to the corresponding project relative path. The $source_dir holds the absolute path for source directory.
    sed -i -e "s,<source>$source_dir,<source>source,g" $coverage_report_path

	echo "deactivate virtual environment"
	deactivate

	if [ "${CLEAN:-true}" = "true" ]; then
		rm .coverage
		rm -fr .pytest_cache
		rm -fr __pycache__ test/__pycache__
	fi
}

run_python_test_concurrently() {
	local component_path=$1
	local component_name=$2

	echo "------------------------------------------------------------------------------"
	echo "[Test] Run python unit test with coverage for $component_path $component_name"
	echo "------------------------------------------------------------------------------"
	cd $component_path

	"$POETRY_COMMAND" install
	source $("$POETRY_COMMAND" env info --path)/bin/activate

    echo "Installing python packages"
    # install test dependencies in the python virtual environment
	t pip install --upgrade pip 
	t pip install --upgrade pytest-xdist

	# setup coverage report path
	mkdir -p $source_dir/tests/coverage-reports
	coverage_report_path=$source_dir/tests/coverage-reports/$component_name.coverage.xml
	echo "coverage report path set to $coverage_report_path"

	# Use -vv for debugging
	python3 -m pytest -n 8 --cov --cov-report=term-missing --cov-report "xml:$coverage_report_path"

    # The pytest --cov with its parameters and .coveragerc generates a xml cov-report with `coverage/sources` list
    # with absolute path for the source directories. To avoid dependencies of tools (such as SonarQube) on different
    # absolute paths for source directories, this substitution is used to convert each absolute source directory
    # path to the corresponding project relative path. The $source_dir holds the absolute path for source directory.
    sed -i -e "s,<source>$source_dir,<source>source,g" $coverage_report_path

	echo "deactivate virtual environment"
	deactivate

	if [ "${CLEAN:-true}" = "true" ]; then
		rm .coverage
		rm -fr .pytest_cache
		rm -fr __pycache__ test/__pycache__
	fi
}

prepare_jest_coverage_report() {
	local component_name=$1

    if [ ! -d "coverage" ]; then
        echo "ValidationError: Missing required directory coverage after running unit tests"
        exit 129
    fi

	# prepare coverage reports
    rm -fr coverage/lcov-report
    mkdir -p $coverage_reports_top_path/jest
    coverage_report_path=$coverage_reports_top_path/jest/$component_name
    rm -fr $coverage_report_path
    mv coverage $coverage_report_path
}

run_javascript_test() {
    local component_path=$1
	local component_name=$2

    echo "------------------------------------------------------------------------------"
    echo "[Test] Run javascript unit test with coverage for $component_path $component_name"
    echo "------------------------------------------------------------------------------"
    echo "cd $component_path"
    cd $component_path

	# install and build for unit testing
	npm install

    # run unit tests
    npm run test

    # prepare coverage reports
	prepare_jest_coverage_report $component_name
}

run_cdk_project_test() {
	local component_path=$1
  	local component_name=solutions-constructs

	echo "------------------------------------------------------------------------------"
	echo "[Test] $component_name"
	echo "------------------------------------------------------------------------------"
    cd $component_path

	# install and build for unit testing
	npm install

	## Option to suppress the Override Warning messages while synthesizing using CDK
	# export overrideWarningsEnabled=false

	# run unit tests
	npm run test -- -u

    # prepare coverage reports
	prepare_jest_coverage_report $component_name
}

run_frontend_project_test() {
	local component_path=$1
  	local component_name=solutions-portal

	echo "------------------------------------------------------------------------------"
	echo "[Test] $component_name"
	echo "------------------------------------------------------------------------------"
    cd $component_path

	# install and build for unit testing
	npm install --legacy-peer-deps

	# run unit tests
	npm run test:coverage -- -u

    # prepare coverage reports
	prepare_jest_coverage_report $component_name
}

# Get reference for source folder
starting_dir=$PWD
cd ../source
source_dir=$PWD
echo $source_dir

# Generate requirement.txt files
cd $source_dir/constructs/lib/microbatch/main/services/lambda/layer
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
    cd "$full_path"
    "$POETRY_COMMAND" export --format requirements.txt --output requirements.txt --without-hashes --without dev
done


# Download MaxMind database
if [ ! -e $source_dir/constructs/lambda/plugin/standard/assets/GeoLite2-City.mmdb ]; then
  echo "Download MaxMind database file"
  curl --create-dirs -o $source_dir/constructs/lambda/plugin/standard/assets/GeoLite2-City.mmdb https://aws-gcr-solutions-assets.s3.amazonaws.com/maxmind/GeoLite2-City.mmdb
fi

if [ ! -e $source_dir/constructs/lambda/microbatch/s3_object_replication/enrichment/maxminddb/GeoLite2-City.mmdb ]; then
  echo "Copy MaxMind database file"
  mkdir -p $source_dir/constructs/lambda/microbatch/s3_object_replication/enrichment/maxminddb/
  cp $source_dir/constructs/lambda/plugin/standard/assets/GeoLite2-City.mmdb $source_dir/constructs/lambda/microbatch/s3_object_replication/enrichment/maxminddb/GeoLite2-City.mmdb
fi

# Run unit tests
echo "Running unit tests"

coverage_reports_top_path=$source_dir/test/coverage-reports

portal_dir=$source_dir/portal
cd $portal_dir
t npm install --legacy-peer-deps
t npm run build

construct_dir=$source_dir/constructs

# re-create symbolink
recreate_symbolic_link ../../../microbatch/utils/grafana $construct_dir/lambda/api/grafana/util/grafana
recreate_symbolic_link ../utils $construct_dir/lambda/microbatch/batch_update_partition/utils
recreate_symbolic_link ../utils $construct_dir/lambda/microbatch/etl_helper/utils
recreate_symbolic_link ../utils $construct_dir/lambda/microbatch/metadata_writer/utils
recreate_symbolic_link ../utils $construct_dir/lambda/microbatch/pipeline_resources_builder/utils
recreate_symbolic_link ../utils $construct_dir/lambda/microbatch/s3_object_migration/utils
recreate_symbolic_link ../utils $construct_dir/lambda/microbatch/s3_object_replication/utils
recreate_symbolic_link ../utils $construct_dir/lambda/microbatch/s3_object_scanning/utils
recreate_symbolic_link ../utils $construct_dir/lambda/microbatch/send_email/utils
recreate_symbolic_link ../utils $construct_dir/lambda/microbatch/connector/utils

# Create a process pool
tests_to_run=()

#Test the CDK project
t run_cdk_project_test $construct_dir
tests_to_run+=($!)

#Test the Frontend
t run_frontend_project_test $portal_dir
tests_to_run+=($!)

t run_python_test_concurrently $construct_dir/lambda/microbatch microbatch
tests_to_run+=($!)

# Test the attached Lambda function
t run_python_test $construct_dir/lambda/common-lib common-lib &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/custom-resource custom-resource &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/main/cfnHelper cfnHelper &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/main/sfnHelper sfnHelper &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/pipeline/common/custom-resource custom-resource2 &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/pipeline/log-processor log-processor &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/plugin/standard plugin &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/api/resource resource-api &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/api/pipeline svc-pipeline-api &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/api/log_agent_status log_agent_status &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/api/app_log_ingestion app_log_ingestion &  
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/api/log_source log_source &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/api/log_conf log_conf &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/api/app_pipeline app_pipeline &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/api/cross_account cross_account &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/api/cluster aos_cluster &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/api/pipeline_ingestion_flow pipeline_ingestion_flow &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/api/cwl cloudwatch_api &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/api/alarm alarm_api &
tests_to_run+=($!)
t run_python_test $construct_dir/lib/kinesis/lambda lambda &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/api/grafana grafana &
tests_to_run+=($!)
t run_python_test $construct_dir/lambda/metrics metrics &
tests_to_run+=($!)
cd $construct_dir/../../deployment/ecr/clo-s3-list-objects
rm -rf common-lib
t run_python_test $construct_dir/../../deployment/ecr/clo-s3-list-objects s3-list-objects &
tests_to_run+=($!)

function wait_all_python_test() {
	for i in "${!tests_to_run[@]}"; do
	test_pid=${tests_to_run[$i]}
	wait "$test_pid"
	done
}

t wait_all_python_test 

echo "All tests completed successfully."

# Return to the source/ level
cd $starting_dir