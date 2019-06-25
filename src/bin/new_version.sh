#!/bin/bash
# usage ./new_version.sh R2018a 0 R2018a 1
# moves version from R2018a R2018a revision 1

if [ "$(uname)" == "Darwin" ]; then
  echo "This script does not work on macOS."
  exit 2
fi

if [ "$#" -ne 4 ]; then
  echo "Usage: $0 <old_version> <old_revision> <new_version> <new_revision>" >&2
  echo "Example: $0 R2018a 0 R2018a 1" >&2
  exit 1
fi

if [ "$2" -eq 0 ]; then
  old_version=$1
  old_package=$1
else
  old_version=$1"\srevision\s"$2
  old_package=$1"-rev"$2
fi

if [ "$4" -eq 0 ]; then
  new_version=$3
  new_package=$3
  silent=
  if [ "${new_version:1:4}" -eq "${old_version:1:4}" ]; then
    year_silent=silent
  else
    year_silent=
  fi
else
  new_version=$3"\srevision\s"$4
  new_package=$3"-rev"$4
  silent=silent
fi

old_version_without_revision=$1
old_version_year=${old_version:1:4}
old_version_letter=${old_version:5:1}

new_version_without_revision=$3
new_version_year=${new_version:1:4}
new_version_letter=${new_version:5:1}

echo "Update application and documentation version..."
./new_version_file.sh $old_version $new_version ../webots/core/WbApplicationInfo.cpp
./new_version_file.sh $old_version $new_version ../../resources/version.txt
./new_version_file.sh $old_version $new_version ../packaging/webots_version.txt
./new_version_file.sh $old_version $new_version ../../Contents/Info.plist
./new_version_file.sh "Copyright 1998-[0-9]\+" "Copyright 1998-"$new_version_year ../../Contents/Info.plist $year_silent

# documentation
./new_version_file.sh "major:\\s'.*'" "major: '"$new_version_without_revision"'" ../../docs/js/showdown-extensions.js $silent
./new_version_file.sh "full:\\s'.*'" "full: '"$new_version"'" ../../docs/js/showdown-extensions.js
./new_version_file.sh "package:\\s'.*'" "package: '"$new_package"'" ../../docs/js/showdown-extensions.js
./new_version_file.sh "year:\\s[0-9]\+" "year: "$new_version_year ../../docs/js/showdown-extensions.js $year_silent
./new_version_file.sh "Webots-"$old_version_year"-"$old_version_letter"-release" "Webots-"$new_version_year"-"$new_version_letter"-release" ../../docs/doc.php $silent
