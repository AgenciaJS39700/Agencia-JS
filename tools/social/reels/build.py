import subprocess, glob, sys
def run(c): subprocess.run(c, shell=True, check=True)
SPEC = {
 'reel-2026-10-20-mensaje-a': ([2.6,3.3,3.3,3.3,4.2], 'pop', ['fade']*4),
 'reel-2026-10-24-mi-reaccion': ([3.0,1.5,1.5,1.5,2.6,4.2], 'pop', ['slideup','slideup','slideup','slideup','fade']),
 'reel-2026-10-29-datos-miedo': ([2.8,3.4,3.4,3.4,3.4,4.2], 'spooky', ['fadeblack']*5),
 'reel-2026-10-31-disfraz': ([2.6,3.2,3.6,4.2], 'spooky', ['fade','fadewhite','fade']),
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
