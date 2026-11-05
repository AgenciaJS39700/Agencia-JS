import subprocess, glob, sys
def run(c): subprocess.run(c, shell=True, check=True)
SPEC = {
 'reel-2026-11-13-viernes-13': ([3.2,3.2,3.2,3.2,3.2,4.6], 'spooky', ['fadewhite','slideup','fade','slideup','fade']),
}
X=0.35; FPS=30
for name,(durs,music,trans) in SPEC.items():
    imgs=sorted(glob.glob(f'{name}_*.png'))
    assert len(imgs)==len(durs),(name,len(imgs))
    segs=[]
    for i,(im,d) in enumerate(zip(imgs,durs)):
        fr=int(round((d+X)*FPS)); seg=f'/tmp/{name}_{i}.mp4'
        run(f"ffmpeg -loglevel error -y -loop 1 -i {im} -vf \"scale=2160:3840,zoompan=z='1+0.05*on/{fr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={fr}:s=1080x1920:fps={FPS},format=yuv420p\" -frames:v {fr} -c:v libx264 -preset veryfast -crf 18 {seg}")
        segs.append((seg,d+X))
    inputs=' '.join(f'-i {s}' for s,_ in segs)
    fc=[]; prev='[0:v]'; off=0
    for i in range(1,len(segs)):
        off+=segs[i-1][1]-X if i==1 else segs[i-1][1]-X
        dur = 0.15 if trans[i-1]=='fadewhite' else X
        out=f'[v{i}]'
        fc.append(f"{prev}[{i}:v]xfade=transition={trans[i-1]}:duration={dur}:offset={off:.3f}{out}")
        prev=out
    total=sum(durs)+X
    filt=';'.join(fc)
    run(f"ffmpeg -loglevel error -y {inputs} -i {music}.wav -filter_complex \"{filt}\" -map \"{prev}\" -map {len(segs)}:a -t {total:.2f} -af \"afade=t=out:st={total-1.2:.2f}:d=1.2\" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r {FPS} -c:a aac -b:a 192k -movflags +faststart {name}.mp4")
    print(name,'ok',round(total,1))
