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

	if [ -e $target ]; then
		echo "Removing existing symlink: ${target}."
		unlink $target
	fi

	if [ -e $source ]; then
		echo "Check source: ${source} exists."
	fi

	echo "Creating symlink: source -> ${source}, target -> ${target}."
	ln -s $source $target
}

build_common_lib() {

	echo "Build Common Lib"
	cd $source_dir/constructs/lambda/common-lib
	python3 -m venv .venv-test
	source .venv-test/bin/activate

	pip3 install --upgrade build
	python -m build

	echo "deactivate virtual environment"
	deactivate

	rm -fr .venv-test
}

setup_python_env() {
	if [ -d "./.venv-test" ]; then
		echo "Reusing already setup python venv in ./.venv-test. Delete ./.venv-test if you want a fresh one created."
		return
	fi

  	echo "Setting up python venv"
	python3 -m venv .venv-test
	echo "Initiating virtual environment"
	source .venv-test/bin/activate

    echo "Installing python packages"
    # install test dependencies in the python virtual environment
	pip install --upgrade pip pytest-xdist
	pip3 install --no-cache-dir -r test/requirements-test.txt
	pip3 install -e $source_dir/constructs/lambda/common-lib
	# pip3 install -r requirements.txt --target .

	echo "deactivate virtual environment"
	deactivate
}

run_python_test() {
	local component_path=$1
	local component_name=$2

	echo "------------------------------------------------------------------------------"
	echo "[Test] Run python unit test with coverage for $component_path $component_name"
	echo "------------------------------------------------------------------------------"
	cd $component_path

	if [ "${CLEAN:-true}" = "true" ]; then
        rm -fr .venv-test
    fi

	setup_python_env

	echo "Initiating virtual environment"
	source .venv-test/bin/activate

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
		rm -fr .venv-test
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

	if [ "${CLEAN:-true}" = "true" ]; then
        rm -fr .venv-test
    fi

	setup_python_env

	echo "Initiating virtual environment"
	source .venv-test/bin/activate

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
		rm -fr .venv-test
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
source_dir="$(cd $PWD; pwd -P)"
echo $source_dir

# Download MaxMind database
if [ ! -e $source_dir/constructs/lambda/plugin/standard/assets/GeoLite2-City.mmdb ]; then
  echo "Download MaxMind database file"
  curl --create-dirs -o $source_dir/constructs/lambda/plugin/standard/assets/GeoLite2-City.mmdb https://aws-gcr-solutions-assets.s3.amazonaws.com/maxmind/GeoLite2-City.mmdb
fi

if [ ! -e $source_dir/constructs/lambda/microbatch/utils/enrichment/maxminddb/GeoLite2-City.mmdb ]; then
  echo "Copy MaxMind database file"
  mkdir -p $source_dir/constructs/lambda/microbatch/utils/enrichment/maxminddb/
  cp $source_dir/constructs/lambda/plugin/standard/assets/GeoLite2-City.mmdb $source_dir/constructs/lambda/microbatch/utils/enrichment/maxminddb/GeoLite2-City.mmdb
fi

# Run unit tests
echo "Running unit tests"

coverage_reports_top_path=$source_dir/test/coverage-reports

portal_dir=$source_dir/portal
cd $portal_dir
npm install --legacy-peer-deps
npm run build

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

# Create a process pool
tests_to_run=()

#Test the CDK project
run_cdk_project_test $construct_dir
tests_to_run+=($!)

#Test the Frontend
run_frontend_project_test $portal_dir
tests_to_run+=($!)

# Test the attached Lambda function
run_python_test $construct_dir/lambda/common-lib common-lib &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/custom-resource custom-resource &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/main/cfnHelper cfnHelper &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/main/sfnHelper sfnHelper &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/pipeline/common/custom-resource custom-resource2 &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/pipeline/log-processor log-processor &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/plugin/standard plugin &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/api/resource resource-api &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/api/pipeline svc-pipeline-api &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/api/log_agent_status log_agent_status &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/api/app_log_ingestion app_log_ingestion &  
tests_to_run+=($!)
run_python_test $construct_dir/lambda/api/log_source log_source &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/api/log_conf log_conf &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/api/app_pipeline app_pipeline &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/api/cross_account cross_account &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/api/cluster aos_cluster &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/api/pipeline_ingestion_flow pipeline_ingestion_flow &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/api/cwl cloudwatch_api &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/api/alarm alarm_api &
tests_to_run+=($!)
run_python_test_concurrently $construct_dir/lambda/microbatch microbatch &
tests_to_run+=($!)
run_python_test $construct_dir/ecr/s3-list-objects s3-list-objects &
tests_to_run+=($!)
run_python_test $construct_dir/lib/kinesis/lambda lambda &
tests_to_run+=($!)
run_python_test $construct_dir/lambda/api/grafana grafana &
tests_to_run+=($!)

for i in "${!tests_to_run[@]}"; do
  test_pid=${tests_to_run[$i]}
  wait "$test_pid"
done

echo "All tests completed successfully."

# run_python_test $construct_dir/lambda/common-lib common-lib
# run_python_test $construct_dir/lambda/custom-resource custom-resource
# run_python_test $construct_dir/lambda/main/cfnHelper cfnHelper
# run_python_test $construct_dir/lambda/main/sfnHelper sfnHelper
# run_python_test $construct_dir/lambda/pipeline/service/log-processor svc-log-processor
# run_python_test $construct_dir/lambda/pipeline/app/log-processor app-log-processor
# run_python_test $construct_dir/lambda/pipeline/common/opensearch-helper opensearch-helper
# run_python_test $construct_dir/lambda/pipeline/common/custom-resource custom-resource2
# run_python_test $construct_dir/lambda/plugin/standard plugin

# run_python_test $construct_dir/lambda/api/resource resource-api
# run_python_test $construct_dir/lambda/api/pipeline svc-pipeline-api
# run_python_test $construct_dir/lambda/api/log_agent_status log_agent_status  
# run_python_test $construct_dir/lambda/api/app_log_ingestion app_log_ingestion  
# run_python_test $construct_dir/lambda/api/log_source log_source
# run_python_test $construct_dir/lambda/api/log_conf log_conf
# run_python_test $construct_dir/lambda/api/app_pipeline app_pipeline
# run_python_test $construct_dir/lambda/api/cross_account cross_account
# run_python_test $construct_dir/lambda/api/cluster aos_cluster
# run_python_test $construct_dir/lambda/api/pipeline_ingestion_flow pipeline_ingestion_flow
# run_python_test $construct_dir/lambda/api/cwl cloudwatch_api
# run_python_test $construct_dir/lambda/api/alarm alarm_api
# run_python_test $construct_dir/ecr/s3-list-objects s3-list-objects
# run_python_test $construct_dir/lib/kinesis/lambda lambda

# Return to the source/ level
cd $source_dir