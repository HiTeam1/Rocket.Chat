#!/bin/bash
# ReadMe: This Script will copy all your PR changed files to a tar.gz and zip, while keeping folder hierarchy

# Make Sure you are on the PRed branch
changed_files=$(git diff --name-only hichat)
timestamp=$(date +%Y%m%d)

mkdir pr_changed_files
for file in $changed_files; do
	echo "Changed file: $file"
	mkdir -p $(dirname ./pr_changed_files/$file) && touch $file
	cat $file > ./pr_changed_files/$file
done

targz_name="pr_changed_files_${timestamp}.tar.gz"
zip_name="pr_changed_files_${timestamp}.zip"

tar -czf  "$targz_name" pr_changed_files --force-local
zip -r -o "$zip_name" pr_changed_files
rm -rf pr_changed_files
echo "Created: $targz_name"
echo "Created: $zip_name"


