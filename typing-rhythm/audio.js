(function(){'use strict';
 class RhythmAudio {
  constructor(){this.context=null;this.master=null;this.nodes=new Set();this.volume=.12;this.active=false;this.timer=null;this.origin=0;this.generation=0;this.clockMode='未開始';this.scheduled=0;this.lastClock=0;this.hits=0;this.lastSound=null;this.dropped=0;}
  async prepare(){if(!this.context){this.context=new AudioContext({latencyHint:'interactive'});this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);}await this.context.resume();if(this.context.state!=='running')throw Error('音声を開始できません。もう一度開始してください。');}
  setVolume(v){this.volume=v;if(this.master&&this.active)this.master.gain.setValueAtTime(v,this.context.currentTime);}
  outputTime(perf=performance.now()){
   const c=this.context;if(!c)return 0;const now=performance.now(),ts=c.getOutputTimestamp?c.getOutputTimestamp():null;
   const mappedNow=ts?ts.contextTime+(now-ts.performanceTime)/1000:NaN;
   // Some Chromium starts report contextTime≈0 with performanceTime=0. Never
   // extrapolate those startup placeholders as if they were an output clock.
   if(ts&&ts.contextTime>.002&&ts.performanceTime>0&&Number.isFinite(mappedNow)&&now-ts.performanceTime>=-10&&now-ts.performanceTime<250&&mappedNow<=c.currentTime+.01&&mappedNow>=c.currentTime-.25){this.clockMode='出力時計';return ts.contextTime+(perf-ts.performanceTime)/1000;}
   this.clockMode='推定時計';return c.currentTime+(perf-now)/1000-(c.baseLatency||0)-(c.outputLatency||0);
  }
  songTime(perf=performance.now()){return this.outputTime(perf)-this.origin;}
  tone(at,frequency,length=.025,level=.3){const c=this.context;if(!c||!this.active)return;if(this.nodes.size>=48){this.dropped++;return;}const source=c.createOscillator(),gain=c.createGain();source.type='sine';source.frequency.value=frequency;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.002);gain.gain.exponentialRampToValueAtTime(.0001,at+length);source.connect(gain).connect(this.master);this.nodes.add(source);source.onended=()=>{this.nodes.delete(source);source.disconnect();gain.disconnect();};source.start(at);source.stop(at+length+.005);}
  start(chart,speed,onInterrupt){
   this.stop();const c=this.context;this.active=true;this.master.gain.setValueAtTime(this.volume,c.currentTime);this.scheduled=0;
   const lead=.25,count=chart.countInSeconds/speed;this.origin=c.currentTime+lead+count;let next=-chart.countInBeats;const token=this.generation;this.lastTick=performance.now();
   const tick=()=>{if(!this.active||token!==this.generation)return;const now=performance.now();if(now-this.lastTick>100){onInterrupt('処理が遅れたため中断しました。もう一度試しましょう。');return;}this.lastTick=now;if(c.state!=='running'){onInterrupt('音声が中断されました。もう一度開始してください。');return;}
    const horizon=c.currentTime+.15;
    while(next<=chart.lastBeat){const song=next<0?next*60/chart.map.initial/speed:chart.map.at(next)/speed;const at=this.origin+song;if(at>horizon)break;if(at<c.currentTime-.025){onInterrupt('音の予約が遅れたため中断しました。もう一度試しましょう。');return;}if(at>=c.currentTime){this.tone(at,880);this.scheduled++;}next++;}
   };tick();if(this.active)this.timer=setInterval(tick,25);
  }
  // Short, bounded voices; the same renderer is used by OfflineAudioContext tests.
  static voice(c,destination,preset,value,at){
   const source=c.createOscillator(),gain=c.createGain();let start,end,length,level,type='sine';
   if(value==='miss'){start=125;end=85;length=.09;level=.11;type='triangle';}
   else if(preset==='chip'){start=end=440*Math.pow(2,(value-69)/12);length=.13;level=.10;type='square';}
   else {const d=RhythmCore.DRUMS[value];if(!d)throw Error('Unknown drum');const p=d.pitch;[start,end,length,level,type]=({kick:[150*p,45*p,.18,.24,'sine'],tom:[260*p,100*p,.14,.20,'sine'],wood:[800*p,600*p,.045,.17,'triangle'],snare:[380*p,170*p,.075,.10,'sawtooth'],hat:[2100*p,1900*p,.025,.055,'square']})[d.kind];}
   source.type=type;source.frequency.setValueAtTime(start,at);source.frequency.exponentialRampToValueAtTime(end,at+length);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.002);gain.gain.exponentialRampToValueAtTime(.0001,at+length);gain.gain.linearRampToValueAtTime(0,at+length+.004);source.connect(gain).connect(destination);source.start(at);source.stop(at+length+.005);return {source,gain,length:length+.005};
  }
  hit(preset,value){if(!this.active)return;if(this.nodes.size>=12){this.dropped++;return;}const voice=RhythmAudio.voice(this.context,this.master,preset,value,this.context.currentTime+.002);this.nodes.add(voice.source);voice.source.onended=()=>{this.nodes.delete(voice.source);voice.source.disconnect();voice.gain.disconnect();};this.hits++;this.lastSound={preset,value};}

  stop(){this.generation++;this.active=false;if(this.timer!==null)clearInterval(this.timer);this.timer=null;if(this.master){this.master.gain.cancelScheduledValues(0);this.master.gain.value=0;}for(const source of this.nodes){try{source.stop();}catch{}source.disconnect();}this.nodes.clear();}
 }
 window.RhythmAudio=RhythmAudio;
})();
