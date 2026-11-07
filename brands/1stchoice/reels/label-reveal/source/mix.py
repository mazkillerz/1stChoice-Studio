"""SFX mix for the label reveal reel. Every cue's PEAK lands on its visual frame.
Brand loudness: SFX-only mean about -30 dB, peaks <= -9 dB after AAC (soft tanh limiter at -9.5 dBFS).
  python mix.py            -> out/sfx_only.wav + cue_sheet.csv
"""
import subprocess, csv, numpy as np
from pathlib import Path
from scipy.signal import butter, sosfilt, fftconvolve
SR=48000; DUR=16.6
L='/mnt/attach/outputs/soundlib/'; W='/home/claude/1stchoice-studio/brands/1stchoice/reels/winter-cat/snd/'
WH,PO,CL,EN=L+'01 Whooshes (cuts, transitions)/',L+'02 Pops (text appearing)/',L+'03 Clicks and taps/',L+'04 Endings (logo, reveal)/'
HERO,MID,LIGHT,SOFT=-12,-17,-23,-26
def load(p):
    raw=subprocess.run(['ffmpeg','-v','error','-i',p,'-f','f32le','-ac','1','-ar',str(SR),'-'],capture_output=True,check=True).stdout
    return np.frombuffer(raw,np.float32).copy()
# (peak time s, file, peak dBFS, label, low-pass thump?)
CUES=[
 (0.22,WH+'whoosh_simple.wav',MID,'cat drops in'),
 (0.37,PO+'pop_soft.wav',MID,'cat lands'),
 (0.88,PO+'pop_up.wav',LIGHT,'flag pops'),
 (1.58,WH+'swoosh_fast.wav',MID,'scribble 1'),
 (1.84,WH+'swoosh_06.wav',MID,'scribble 2'),
 (2.12,W+'swish.flac',MID,'scribble 3'),
 (2.61,W+'whip_whoosh.flac',HERO,'cut to printer'),
 *[(2.61+k*0.3019,CL+('click_mouse_2.wav' if k%2 else 'click_mouse.wav'),LIGHT,'stop-motion frame') for k in range(1,6)],
 (2.95,PO+'pop_subtle.wav',MID,'text: printed'),
 (4.44,WH+'whoosh_velocity.wav',MID,'label roll slides in'),
 (5.93,W+'low_thump.flac',HERO,'cut to the dark can'),
 (6.30,PO+'pop_d.wav',MID,'text: guess'),
 (7.50,WH+'swish_double.wav',MID,'kumma rubs out'),
 (7.92,WH+'swoosh_010.wav',MID,'scribble rubs off'),
 (8.06,EN+'shine_6.wav',HERO,'REVEAL'),
 (8.04,W+'low_thump.flac',HERO,'reveal hit'),
 (8.12,PO+'pop_multi.wav',MID,'firework red'),
 (8.40,PO+'pop_multi.wav',MID-3,'firework green'),
 (8.66,PO+'pop_sharp.wav',MID,'jadeed sticker'),
 (8.66,W+'low_thump.flac',MID,'sticker thump'),
 (9.85,WH+'swoosh_014.wav',MID,'cut 1'),
 (10.05,PO+'pop_c.wav',LIGHT,'text: kumma'),
 (10.45,WH+'swoosh_015.wav',MID,'cut 2'),
 (11.06,WH+'swoosh_2.wav',MID,'cut 3'),
 (11.66,WH+'swoosh_023.wav',MID,'cut 4'),
 (12.32,WH+'whoosh_simple.wav',MID,'Classic slides in'),
 (12.62,WH+'swoosh_fast.wav',MID-2,'Passion slides in'),
 (12.97,PO+'pop_b.wav',MID,'text: flavours'),
 (14.08,WH+'whoosh_long_end.wav',MID,'to the end card'),
 (14.14,EN+'shine_1.wav',HERO,'logo'),
 (14.10,W+'low_thump.flac',MID,'logo thump'),
 (14.33,PO+'pop_a.wav',LIGHT,'text: national edition'),
 (14.76,PO+'pop_soft.wav',LIGHT,'photo card'),
 (15.06,PO+'pop_up.wav',SOFT,'flag'),
 (15.36,CL+'tap_confirm.wav',MID,'button'),
 (15.65,PO+'pop_multi.wav',LIGHT,'firework'),
]
def hp(x,f): return sosfilt(butter(2,f,'hp',fs=SR,output='sos'),x)
def lp(x,f): return sosfilt(butter(2,f,'lp',fs=SR,output='sos'),x)
dry=np.zeros(int(SR*DUR)+SR); thump=np.zeros_like(dry); rows=[]
cache={}
for t,f,db,lab in CUES:
    x=cache.get(f); x=cache.setdefault(f,load(f)) if x is None else x
    env=np.abs(x); pk=int(np.argmax(env)); g=10**(db/20)/max(env.max(),1e-6)
    start=int(round(t*SR))-pk
    seg=x*g; s0=max(0,start); seg=seg[s0-start:]; e=min(len(dry),s0+len(seg)); seg=seg[:e-s0]
    (thump if 'thump' in f else dry)[s0:e]+=seg
    rows.append(dict(peak_s=round(t,3),start_s=round(start/SR,3),file=Path(f).name,peak_dbfs=db,what=lab))
dry=hp(dry,90); thump=lp(thump,160)
bus=dry+thump
ir_t=np.arange(int(SR*0.6))/SR; ir=np.random.default_rng(1).standard_normal(len(ir_t))*np.exp(-ir_t/0.12); ir/=np.sqrt((ir**2).sum())
wet=fftconvolve(dry,ir)[:len(bus)]*10**(-20/20)
mix=(bus+wet)[:int(SR*DUR)]
def mean_db(y): return 20*np.log10(np.sqrt(np.mean(y**2))+1e-12)
def finish(y,target,name):
    y=y*10**((target-mean_db(y))/20); c=10**(-9.5/20); y=c*np.tanh(y/c)
    f=int(SR*0.4); y[-f:]*=np.linspace(1,0,f)
    st=np.stack([y,y],1).astype(np.float32)
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ac','2','-ar',str(SR),'-i','-',f'out/{name}.wav'],input=st.tobytes(),check=True)
    print(name,'mean dB',round(mean_db(y),1),'peak dBFS',round(20*np.log10(np.abs(y).max()),1))
Path('out').mkdir(exist_ok=True)
finish(mix.copy(),-30,'sfx_only')
# ---- music bed: Nightfall (future bass), drop at 19.22 s lands on the reveal (8.04 s) ----
OFF=19.22-8.04
m=load('assets/music_nightfall.mp3')[int(OFF*SR):int(OFF*SR)+len(mix)]
tt=np.arange(len(m))/SR
def rms_db(a,b): z=m[int(a*SR):int(b*SR)]; return 20*np.log10(np.sqrt(np.mean(z**2))+1e-12)
g_pre=10**((-35-rms_db(0,7.4))/20); g_post=10**((-29-rms_db(8.1,14))/20)
w=np.clip((tt-7.4)/(8.04-7.4),0,1); w=w*w*(3-2*w)
m=m*(g_pre*(1-w)+g_post*w)
# sidechain duck ~6 dB from the SFX envelope (5 ms attack, 300 ms release)
env=np.abs(mix); a=np.exp(-1/(0.005*SR)); r=np.exp(-1/(0.3*SR)); e=np.zeros_like(env); v=0.0
for n_ in range(len(env)):
    x_=env[n_]; v=a*v+(1-a)*x_ if x_>v else r*v+(1-r)*x_; e[n_]=v
thr=10**(-30/20); duck=1-np.clip(e/thr,0,1)*(1-10**(-6/20))
m=m*duck
fo=np.clip((tt-15.0)/(16.6-15.0),0,1); m=m*(1-fo)**1.5
finish(mix+m,-28,'music_mix')
with open('cue_sheet.csv','w',newline='') as fh:
    w_=csv.DictWriter(fh,fieldnames=list(rows[0])); w_.writeheader(); w_.writerows(rows)
