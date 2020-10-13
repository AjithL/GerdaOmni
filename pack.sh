#!/bin/sh

zip -9r ../application.zip .
cd ..
echo '{"version": 1, "manifestURL": "app://gab.gerda.tech/manifest.webapp"}' > metadata.json
zip -9 gab.gpkg.zip application.zip metadata.json
