import base64,json,os
D=os.path.dirname(os.path.abspath(__file__));A='/tmp/wwp'
keys=[l.split('|')[0] for l in open(f'{D}/lines.txt').read().split('\n') if l.strip()]
os.makedirs(f'{D}/clips',exist_ok=True)
for k in keys+['silent']: os.system(f'cp -n {A}/{k}.mp3 {D}/clips/ 2>/dev/null')
clips={k:base64.b64encode(open(f'{D}/clips/{k}.mp3','rb').read()).decode() for k in keys}
silent=base64.b64encode(open(f'{D}/clips/silent.mp3','rb').read()).decode()
js='const CLIPS='+json.dumps(clips,separators=(',',':'))+';\nconst SILENT_MP3="data:audio/mpeg;base64,'+silent+'";\n'+open(f'{D}/audio.js').read()+'\n'+open(f'{D}/game.js').read()
t=open(f'{D}/template.html').read().replace('/*__AUDIO__*/',js)
open(f'{D}/../index.html','w').write(t);print(len(t),'bytes',len(clips),'clips')
