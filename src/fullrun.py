# Simulated start-to-finish run: real touch input from a "kid bot" at 5x game speed, iPhone 13.
import asyncio,sys,json,random
from playwright.async_api import async_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'file:///workspace/wilson-water-pirates/index.html'
OUT='/workspace/wilson-water-pirates/';ok=True
def chk(n,c,i=''):
    global ok;ok&=bool(c);print(('PASS ' if c else 'FAIL ')+n,i)
BOT='''(()=>{const c=__W.canoe,cy=__W.CY();let best=null,bd=1e9;for(const o of __W.objs()){if(o.type!=='t'||o.hit>=o.hp)continue;const y=cy-(o.wy-__W.dist);if(y<90||y>cy-60)continue;const d=Math.abs(o.x-c.x)+(cy-y)*0.5;if(d<bd){bd=d;best={x:o.x,y}}}
 let g=null;for(const o of __W.objs()){if(o.type!=='g')continue;const y=cy-(o.wy-__W.dist);if(y>cy-320&&y<cy-80){g={x:o.x};break}}return{t:best,g,st:__W.state,card:!!__W.card}})()'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--autoplay-policy=no-user-gesture-required'])
        ctx=await b.new_context(**p.devices['iPhone 13']);m=await ctx.new_page();errs=[]
        m.on('pageerror',lambda e:errs.append(str(e)));m.on('console',lambda x:errs.append(x.text) if x.type=='error' else None)
        await m.goto(BASE+('&' if '?' in BASE else '?')+'debug=1');await m.wait_for_timeout(800)
        vp=await m.evaluate('[innerWidth,innerHeight]');S=vp[0]/400
        await m.evaluate('Object.defineProperty(__W,"dist",{get(){return __W.canoe&&window.__d||0}})') if False else None
        await m.touchscreen.tap(vp[0]*0.5,vp[1]*0.3);await m.wait_for_timeout(600)
        # tap GO like a kid would
        await m.touchscreen.tap(vp[0]*0.5,(await m.evaluate('Math.min(innerHeight/(innerWidth/400)-100,innerHeight/(innerWidth/400)*0.52+230)'))*S)
        await m.wait_for_timeout(300);chk('GO button starts the run',await m.evaluate('__W.state')=='play')
        await m.evaluate('__W.TS=5');taps=0;shots=set();minH=3;t0=asyncio.get_event_loop().time();sw=0
        while True:
            st=await m.evaluate('({s:__W.state,rt:__W.runT,h:__W.hearts,sec:__W.seen.length,dad:__W.dad})')
            if st['s']=='end' or asyncio.get_event_loop().time()-t0>150:break
            minH=min(minH,st['h'])
            if st['s']=='play':
                info=await m.evaluate(BOT.replace('__W.dist','(__W.distV)'))
                if info['t']:
                    await m.touchscreen.tap(info['t']['x']*S,info['t']['y']*S);taps+=1
                if info['g'] and random.random()<0.6:
                    await m.touchscreen.tap(info['g']['x']*S,(await m.evaluate('__W.CY()+80'))*S)
                if taps%9==8:
                    await m.evaluate('__W.switchShooter()');sw+=1
                for k,cond in [('sunny',0),('duckpond',1),('beaver',2),('sunset',3)]:
                    if st['sec']==cond+1 and k not in shots and st['rt']>[18,52,90,128][cond] and not info['card']:
                        shots.add(k);await m.screenshot(path=OUT+f'screenshot-run-{k}.png')
            await m.wait_for_timeout(120)
        r=await m.evaluate('({s:__W.state,score:__W.score,sp:__W.splashes,tr:__W.treasure,d:__W.dadFalls,seen:__W.seen,cards:__W.cards,bumps:__W.bumps,stars:__W.stars,v:__W.audio.stats})')
        print(json.dumps(r));print('taps',taps,'switches',sw,'min hearts',minH,'real secs',round(asyncio.get_event_loop().time()-t0))
        chk('reached Sunset Camp end screen',r['s']=='end')
        chk('all 4 river sections + intro cards',r['seen']==[0,1,2,3] and r['cards']==4,str(r['seen']))
        chk('Dad saved the day at least twice',r['d']>=2,str(r['d']))
        chk('lots of splashes',r['sp']>=25,str(r['sp']))
        chk('treasure collected',r['tr']>=10,str(r['tr']))
        chk('forgiving: >=2 stars for an engaged kid',r['stars']>=2,str(r['stars']))
        chk('many voice lines, one at a time',r['v']['voice']>=12,json.dumps(r['v']))
        await m.wait_for_timeout(1800);await m.screenshot(path=OUT+'screenshot-run-end.png')
        chk('no JS errors',not errs,str(errs[:3]))
        await b.close()
    print('ALL OK' if ok else 'SOME FAILED');sys.exit(0 if ok else 1)
asyncio.run(main())
