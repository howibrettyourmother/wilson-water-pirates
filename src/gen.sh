set -e
cd /tmp/wwp
while IFS='|' read -r k t v; do
  [ -z "$k" ] && continue
  echo "$t" | /tmp/tts/bin/piper -m /tmp/voices/en_US-$v-medium.onnx -f raw_$k.wav --length-scale 0.9 >/dev/null 2>&1
  ffmpeg -y -loglevel error -i raw_$k.wav -af "asetrate=22050*1.18,aresample=24000,atempo=0.92,highpass=f=120,acompressor=threshold=-18dB:ratio=3,volume=1.8,alimiter=limit=0.95" -ac 1 -ar 24000 -b:a 32k $k.mp3
  echo $k $(stat -c%s $k.mp3)
done < /workspace/wilson-water-pirates/src/lines.txt
