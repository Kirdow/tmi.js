#!/bin/bash

. ./scripts/util.sh

# STEP: Flags
UPDATE=false
NO_TEST=false
SKIP_BUILD=false

# STEP: Parse args
for arg in "$@"; do
	case $arg in
		--update)
		UPDATE=true
		shift
		;;
		--no-tests|--no-test)
		NO_TEST=true
		shift
		;;
		--skip-build)
		SKIP_BUILD=true
		shift
		;;
	esac
done

# STEP: Auto update
if [ ! -d 'node_modules' ]; then
	mecho "<purple>No <white>node_modules<purple> found."
	mecho "<green>] UPDATE=true"
	UPDATE=true
fi

# Set error exit
set -e

do_update () {
	if [ "$UPDATE" = true ]; then
		mecho "<green>] @Installing dependencies"
		npm install
	fi
}

do_validate () {
	mecho "<green>[tmi.js] @TypeScript type checking"
	npm run typecheck

	if [ "$SKIP_BUILD" = false ]; then
		mecho "<green>[tmi.js] @Building project"
		npm run build
	else
		mecho "<gold>[tmi.js] @Skipping build (--skip-build)"
	fi
}

do_test () {
	mecho "<green>] @Running tests"
	npm test
}

# Run update if needed
do_update

# Run the validation
time do_validate

mecho "<purple>Done Validation"

if [ "$NO_TEST" = false ]; then
	# Run the tests
	time do_test

	mecho "<purple>Done tests"
fi
