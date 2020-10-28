#!/bin/zsh

# Create directories
mkdir -p assets/from-node

# Remove old dir
rm -rf assets/from-node/bulma

# Copy required files
cp -R node_modules/bulma assets/from-node/
