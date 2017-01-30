#!/bin/env bash

rm -rf public/

hugo

cd public || exit

git init && git remote add origin git@github.com:cissoid/cissoid.github.io

git config-user cissoid yangtukun1412@gmail.com

git add ./* && git commit -m "Updated."

git push -f origin master

cd ..
