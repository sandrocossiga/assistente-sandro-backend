#!/bin/bash
echo "➡️ Scarico ffmpeg..."
mkdir -p ./bin
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-i686-static.tar.xz | tar -xJ --strip-components=1 -C ./bin
chmod +x ./bin/ffmpeg
