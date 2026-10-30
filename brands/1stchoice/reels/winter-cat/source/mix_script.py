import subprocess, numpy as np, soundfile as sf, pyloudnorm as pyln
SR=48000; D=10.0; N=int(SR*D); meter=pyln.Meter(SR)
def load(f,ss=0,dur=None):
    a=['ffmpeg','-v','quiet','-ss',str(ss),'-i',f]+(['-t',str(dur)] if dur else [])+['-ac','2','-ar',str(SR),'-f','f32le','-']
    return np.frombuffer(subprocess.run(a,capture_output=True).stdout,np.float32).reshape(-1,2).astype(np.float64)
def event_db(x):            # loudest 50 ms RMS of the clip = how loud the hit "feels"
    m=x.mean(1); w=int(0.05*SR); e=np.sqrt(np.convolve(m**2,np.ones(w)/w,'valid')+1e-12); return 20*np.log10(e.max())
db=lambda g:10**(g/20)
sfx=np.zeros((N,2)); hits=[]
def cue(f,t,target,ss=0,dur=None,fade=0.0,hero=False):
    x=load(f,ss,dur)
    if fade: n=int(fade*SR); x[-n:]*=np.linspace(1,0,n)[:,None]
    x*=db(target-event_db(x))
    if t<0: x=x[int(-t*SR):]; t=0
    s=int(t*SR); x=x[:N-s]; sfx[s:s+len(x)]+=x
    if hero: hits.append(t+ (np.argmax(np.abs(x).sum(1))/SR))
# targets in dBFS (loudest 50 ms): hero -12 .. light -22
cue('dl/1330.mp3',0.0,-30,4.6,6.75,0.5)                 # campfire crackle, quiet bed
cue('dl/1345.mp3',0.82,-22)                             # fire flares in the gust
cue('dl/1474.mp3',0.25,-21)                             # wind body
cue('dl/1471.mp3',0.56,-15,hero=True)                   # wind swoosh peaks on the hood slap
cue('dl/2161.mp3',0.90,-13,hero=True)                   # hood slaps down
cue('dl/1898.mp3',0.93,-21,1.3)                         # cloth
cue('dl/166.mp3',2.61,-21)                              # reach toward the fire
cue('dl/586.mp3',3.50,-15,hero=True)                    # "!"
cue('dl/1927.mp3',4.32,-19); cue('dl/1927.mp3',4.62,-19)   # deadpan cricket (alone in silence)
cue('dl/166.mp3',4.61,-17)                              # grab whoosh
cue('dl/3169.mp3',4.83,-15,hero=True)                   # paw on the can
cue('dl/866.mp3',5.20,-23)                              # cold sparkle
cue('dl/3083.mp3',5.66,-21)                             # wink sparkle
cue('dl/1492.mp3',6.12,-15,hero=True)                   # whip zoom into the cut
cue('dl/2933.mp3',7.40,-11,hero=True); cue('dl/2299.mp3',7.39,-18)   # real can lands
for k in range(3): cue('dl/2364.mp3',7.58+0.12*k,-19)   # headline words
cue('dl/3005.mp3',8.00,-21)                             # logo
# music bed: Lyria, beat drop on the hood slap (1.0 s); out for the deadpan; back on the grab
m=load('music.mp3',20.38,D); m=np.pad(m,((0,max(0,N-len(m))),(0,0)))[:N]
m*=db(-21-meter.integrated_loudness(m))                 # bed sits at -21 LUFS before the master gain
t=np.arange(N)/SR; env=np.ones(N)
env[(t>=4.10)&(t<4.93)]=0
for a,b in [(4.06,4.10),(4.93,4.97)]:
    sel=(t>=a)&(t<b); env[sel]=np.linspace(1,0,sel.sum()) if a<4.5 else np.linspace(0,1,sel.sum())
env*=np.clip((D-t)/1.4,0,1)
duck=np.ones(N)                                          # dip the music 5 dB under each hero hit
for h in hits:
    d=np.clip(1-np.abs(t-h-0.05)/0.28,0,1); duck=np.minimum(duck,1-(1-db(-5))*d)
m*=(env*duck)[:,None]
def master(x,target):
    x=x*db(target-meter.integrated_loudness(x))
    # true-peak-ish ceiling at -1.5 dBFS with a soft knee
    c=db(-1.5); x=np.where(np.abs(x)>c*0.8, np.sign(x)*(c*0.8+(c*0.2)*np.tanh((np.abs(x)-c*0.8)/(c*0.2))), x)
    return x
mix=master(sfx+m,-14); only=master(sfx,-16)
sf.write('mix_music.wav',mix,SR,subtype='PCM_16'); sf.write('mix_sfx.wav',only,SR,subtype='PCM_16')
for n,x in [('music',mix),('sfx',only)]: print(n,'LUFS',round(meter.integrated_loudness(x),1),'peak dBFS',round(20*np.log10(np.abs(x).max()),1))
print('music bed vs sfx hits: bed',round(meter.integrated_loudness(m),1),'LUFS')
