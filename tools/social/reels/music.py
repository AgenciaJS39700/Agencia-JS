# Música original sin derechos (síntesis), 44.1 kHz estéreo
import numpy as np, wave, sys
SR=44100
def env(n,a=0.005,r=0.3):
    t=np.arange(n)/SR; e=np.minimum(1,t/a)*np.exp(-t/r); return e
def tone(f,d,kind='saw',a=0.005,r=0.4,vol=0.3):
    n=int(d*SR); t=np.arange(n)/SR
    if kind=='saw': w=2*(t*f%1)-1
    elif kind=='sq': w=np.sign(np.sin(2*np.pi*f*t))
    elif kind=='bell': w=np.sin(2*np.pi*f*t)+0.5*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*3)+0.25*np.sin(2*np.pi*f*5.4*t)*np.exp(-t*6)
    else: w=np.sin(2*np.pi*f*t)
    return w*env(n,a,r)*vol
from scipy.signal import lfilter
def lp(x,c=0.15):
    return lfilter([c],[1,-(1-c)],x)
def kick(): n=int(.35*SR); t=np.arange(n)/SR; f=50+90*np.exp(-t*30); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*9)*0.9
def snare(): n=int(.22*SR); t=np.arange(n)/SR; return (np.random.randn(n)*0.5+np.sin(2*np.pi*190*t)*0.4)*np.exp(-t*18)*0.45
def hat(): n=int(.06*SR); t=np.arange(n)/SR; h=np.random.randn(n); h=h-np.convolve(h,np.ones(4)/4,'same'); return h*np.exp(-t*60)*0.18
def mtof(m): return 440*2**((m-69)/12)
def build(style,dur,out):
    np.random.seed(7)
    bpm=112 if style=='pop' else 96; beat=60/bpm; n=int(dur*SR)+SR
    L=np.zeros(n); R=np.zeros(n)
    def add(sig,t,pan=0.5):
        i=int(t*SR)
        if i>=n: return
        j=min(n,i+len(sig)); L[i:j]+=sig[:j-i]*(1-pan)*2*0.5+sig[:j-i]*0.5*(1-abs(pan-0.5)); R[i:j]+=sig[:j-i]*pan*2*0.5+sig[:j-i]*0.5*(1-abs(pan-0.5))
    if style=='pop':
        prog=[(60,[60,64,67,71]),(57,[57,60,64,67]),(53,[53,57,60,64]),(55,[55,59,62,67])]  # Cmaj7 Am7 Fmaj7 G
    else:
        prog=[(57,[57,60,64]),(53,[53,57,60]),(52,[52,56,59]),(57,[57,60,64])]  # Am F E Am (oscuro)
    bars=int(dur/(4*beat))+2
    for b in range(bars):
        root,ch=prog[b%4]; t0=b*4*beat
        for k in range(4):
            tb=t0+k*beat
            add(kick() if style=='pop' or k%2==0 else kick()*0.8, tb)
            if k in (1,3): add(snare(), tb, 0.45)
            for h in range(2): add(hat()*(1 if style=='pop' else 0.6), tb+h*beat/2, 0.65)
            add(lp(tone(mtof(root-12),beat*0.9,'saw',r=0.25,vol=0.35),0.08), tb, 0.5)
        if style=='pop':
            for k in range(8):
                f=mtof(ch[(k*3)%len(ch)]+12); add(lp(tone(f,beat*0.45,'sq',r=0.12,vol=0.10),0.25), t0+k*beat/2, 0.3 if k%2 else 0.7)
            for m in ch: add(lp(tone(mtof(m),4*beat,'saw',a=0.3,r=2.5,vol=0.05),0.05), t0, 0.5)
        else:
            mel=[ch[0]+24,ch[2]+24,ch[1]+24,ch[2]+24+1 if b%4==2 else ch[2]+24]
            for k,m in enumerate(mel): add(tone(mtof(m),beat*1.5,'bell',r=0.9,vol=0.10), t0+k*beat, 0.35 if k%2 else 0.65)
            for m in ch: add(lp(tone(mtof(m-12),4*beat,'saw',a=0.6,r=3,vol=0.05),0.03), t0, 0.5)
    mix=np.stack([L,R],1)[:int(dur*SR)]
    fade=int(1.2*SR); mix[-fade:]*=np.linspace(1,0,fade)[:,None]; mix[:int(.05*SR)]*=np.linspace(0,1,int(.05*SR))[:,None]
    mix=mix/np.max(np.abs(mix))*0.85
    with wave.open(out,'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
build(sys.argv[1], float(sys.argv[2]), sys.argv[3])
