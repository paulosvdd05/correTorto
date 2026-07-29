#!/bin/sh
set -eu

ranking_data_path="${RAILWAY_VOLUME_MOUNT_PATH:-/app/data}"

mkdir -p "$ranking_data_path"
chown -R node:node "$ranking_data_path"

exec su-exec node "$@"
