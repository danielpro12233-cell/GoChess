/* Fisher, the coach: an original character (a mysterious fish in a trench coat and fedora) plus his poems. */
var GCCoach=(function(){
'use strict';
function svg(size,cls){
  var s=size||64;
  return '<svg class="'+(cls||'fisher')+'" width="'+s+'" height="'+(s*1.17).toFixed(0)+'" viewBox="0 0 120 140" role="img" aria-label="Fisher, the coach: a fish in a coat and hat">'
  +'<path d="M42 122 q-14 6 -8 16 q10 -1 16 -10z" fill="#5f97ab"/><path d="M78 122 q14 6 8 16 q-10 -1 -16 -10z" fill="#5f97ab"/>'
  +'<path d="M34 78 Q60 70 86 78 L102 132 Q60 140 18 132 Z" fill="#9c8660"/>'
  +'<path d="M34 78 Q60 70 86 78 L88 90 Q60 82 32 90 Z" fill="#b39d74"/>'
  +'<path d="M48 82 L60 118 L72 82 Z" fill="#d6ebf0"/>'
  +'<path d="M60 118 L60 134" stroke="#7a6847" stroke-width="2"/>'
  +'<path d="M44 74 L36 96 L56 88 Z" fill="#7a6847"/><path d="M76 74 L84 96 L64 88 Z" fill="#7a6847"/>'
  +'<rect x="22" y="112" width="76" height="7" fill="#6b5a3f"/><rect x="55" y="110" width="10" height="11" rx="2" fill="#d9b45a"/>'
  +'<circle cx="50" cy="104" r="2.4" fill="#5c4d34"/><circle cx="70" cy="104" r="2.4" fill="#5c4d34"/><circle cx="50" cy="126" r="2.4" fill="#5c4d34"/><circle cx="70" cy="126" r="2.4" fill="#5c4d34"/>'
  +'<path d="M32 82 Q14 98 20 120 L34 116 Q34 98 42 88 Z" fill="#8a7550"/><path d="M88 82 Q106 98 100 120 L86 116 Q86 98 78 88 Z" fill="#8a7550"/>'
  +'<path d="M12 118 q-5 11 7 14 q7 -5 5 -14z" fill="#7fb2c4"/><path d="M108 118 q5 11 -7 14 q-7 -5 -5 -14z" fill="#7fb2c4"/>'
  +'<ellipse cx="60" cy="54" rx="29" ry="27" fill="#7fb2c4"/>'
  +'<path d="M36 62 Q34 76 46 80 Q40 70 40 62Z" fill="#6aa1b5"/><path d="M84 62 Q86 76 74 80 Q80 70 80 62Z" fill="#6aa1b5"/>'
  +'<path d="M31 56 q-9 -2 -13 4 M31 64 q-9 2 -12 9 M89 56 q9 -2 13 4 M89 64 q9 2 12 9" fill="none" stroke="#4f7f92" stroke-width="1.6" stroke-linecap="round"/>'
  +'<path d="M34 66 q5 6 1 12 M39 68 q4 5 1 10 M86 66 q-5 6 -1 12 M81 68 q-4 5 -1 10" fill="none" stroke="#4f7f92" stroke-width="1.4" stroke-linecap="round"/>'
  +'<g fill="#6aa1b5" opacity=".8"><circle cx="54" cy="36" r="1.6"/><circle cx="60" cy="38" r="1.6"/><circle cx="66" cy="36" r="1.6"/></g>'
  +'<ellipse cx="60" cy="48" rx="31" ry="7" fill="#14232b" opacity=".35"/>'
  +'<circle cx="49" cy="53" r="8.5" fill="#f7f7ef"/><circle cx="71" cy="53" r="8.5" fill="#f7f7ef"/>'
  +'<circle cx="47" cy="55" r="3.8" fill="#14181c"/><circle cx="69" cy="55" r="3.8" fill="#14181c"/>'
  +'<path d="M40 53 a9 9 0 0 1 18 0 Z" fill="#6aa1b5"/><path d="M62 53 a9 9 0 0 1 18 0 Z" fill="#6aa1b5"/>'
  +'<path d="M40 53 H58 M62 53 H80" stroke="#1c2a31" stroke-width="2" stroke-linecap="round"/>'
  +'<path d="M51 71 q9 5 18 0" fill="none" stroke="#25383f" stroke-width="2.4" stroke-linecap="round"/>'
  +'<ellipse cx="60" cy="68" rx="5" ry="3" fill="#8fc0d0"/>'
  +'<ellipse cx="60" cy="38" rx="42" ry="9" fill="#1d2730"/>'
  +'<path d="M35 38 C33 17 46 8 60 12 C74 8 87 17 85 38 Z" fill="#26323d"/>'
  +'<path d="M36 32 Q60 42 84 32 L85 38 Q60 47 35 38 Z" fill="#d9b45a"/>'
  +'<path d="M48 14 Q60 20 72 14" fill="none" stroke="#3a4a58" stroke-width="2" stroke-linecap="round"/>'
  +'<path d="M20 40 Q60 52 100 40" fill="none" stroke="#33414d" stroke-width="1.5" opacity=".7"/>'
  +'</svg>';
}

/* Two-line poems. Slots {san} always sit mid-line so every couplet still rhymes. */
var POEMS={
brilliant:[
 'A pearl is dropped into the deep —\n{san}, a secret few would keep.',
 'You fed the sea a piece of gold,\nyet {san} turned the tide, so bold.',
 'Few would dare this dark descent;\n{san} was boldly, brightly meant.',
 'The surface gleams, the depths are wide —\n{san} hides a lantern inside.'],
great:[
 'One lantern lit the narrow way;\n{san} found it, and saved the day.',
 'Through fog there ran a single thread,\nand {san} is where it led.',
 'The sea allowed one safe retreat —\n{san}, and the tide stays at your feet.',
 'Only one bridge crossed the stormy sea;\n{san} crossed it, as swift as can be.'],
best:[
 'The compass points, and you obey —\n{san} is the engine’s chosen way.',
 'No better stream could you have found;\n{san} keeps your ship on solid ground.',
 'Calm waters and a steady hand —\n{san} goes just as I had planned.',
 'The tide and the moon agree tonight:\n{san} is the move that’s just right.',
 'Deep currents guide a patient mind;\n{san} is the best that one can find.'],
excellent:[
 'Nearly the pearl, a shade away —\n{san} is fine, so let it stay.',
 'A silver scale, if not the gold;\n{san} is good, and still is bold.',
 'Close to the best the tide could show;\n{san} lets the good currents flow.',
 'A gentle splash, a graceful dive;\n{san} keeps your hopes alive.'],
good:[
 'A gentle drift upon the stream;\n{san} is fair, though not the dream.',
 'Not the pearl, yet not a stone;\n{san} holds, though better could be shown.',
 'A steady paddle, calm and slow;\n{san} is sound, yet there’s more to know.',
 'A quiet ripple, small and neat;\n{san} is fine, though not complete.'],
inaccuracy:[
 'The fog creeps in, the lantern wanes;\n{san} slips, and some advantage drains.',
 'One careless flick, a ripple wide;\n{san} lets a little of the tide slide.',
 'A hairline crack within the hull —\n{san} lets the shine grow dull.',
 'The net is loose, the fish swims free;\n{san} lets the edge slip out to sea.'],
mistake:[
 'The tide turns cold, the lanterns fade;\n{san} was a misstep, I’m afraid.',
 'Lost in the mist, you drifted wrong;\n{san} will not carry you for long.',
 'The shoreline slips behind the haze;\n{san} was a wrong turn in the maze.',
 'A crack appears beneath the keel;\n{san} is a wound that’s slow to heal.'],
blunder:[
 'The anchor drops, the ship sinks low;\n{san} was a storm, a bitter blow.',
 'A storm breaks over the dark sea;\n{san} was a wreck, as all can see.',
 'Alas, the net has torn in two;\n{san} lets the big fish slip through.',
 'The depths have claimed a mighty prize;\n{san} brings tears to a fish’s eyes.'],
miss:[
 'The pearl was there, within your reach;\nyou passed it by along the beach.',
 'A golden chance swam right on by;\n{san} let it slip beneath the sky.',
 'Opportunity left the door ajar;\n{san} sailed past it, rather far.',
 'A hidden current, strong and deep,\nwent drifting by, and you let it sleep.']
};
var RESULT={
 win:'You won the sea, you won the shore;\nI’ll lurk below and train some more.',
 loss:'The sea was cruel, the net came up bare;\nno shame — come back and fish with care.',
 draw:'Neither net nor hook held fast;\nthe tide agrees to call it last.'
};
var INTRO={poem:'The tide is calm, the board is set;\nlet us see what we will get.',note:'I am Fisher, and I read the tides of every game. Step through the moves and I will tell you what the sea whispers.'};
var LEVEL_SAYS=[
 'Splash, splash, a gentle start;\nI will play a clumsy part.',
 'Shallow waters, tiny waves;\nI make errors, you be brave.',
 'A friendly swim, a casual stroll;\nI will not take much control.',
 'The club is calm, the stakes are small;\nbut watch your pieces, one and all.',
 'The current quickens, hold on tight;\nI have a few tricks tonight.',
 'Expert waters, cold and deep;\ncareless moves are mine to reap.',
 'A master circles, calm and slow;\none weak square, and down you go.',
 'Grandmaster tides, a heavy squall;\nthe weakest pawn will surely fall.',
 'The abyss is open, the lights are gone;\nI play until the break of dawn.'];
function poem(cls,seed,san){
  var list=POEMS[cls]||POEMS.good,t=list[Math.abs(seed|0)%list.length];
  return t.replace(/\{san\}/g,san||'this move');
}
return {svg:svg,poem:poem,RESULT:RESULT,INTRO:INTRO,LEVEL_SAYS:LEVEL_SAYS};
})();
