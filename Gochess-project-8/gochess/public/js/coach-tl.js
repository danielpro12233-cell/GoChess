/* Fisher's Tagalog voice: poems, table talk and level lines. Loaded before coach.js is used, shares its globals. */
var POEMS_TL={
brilliant:[
 'Perlas sa dagat ay inihulog mo —\n{san}, lihim na bihira ang makakuha nito.',
 'Ginto sa alon ay isinakripisyo;\n{san} ang nagbago ng takbo ng laro.',
 'Kakaunti ang may lakas ng loob;\n{san} ay tapang na kumikinang sa kalaliman.',
 'Madilim ang lalim, malawak ang dagat;\n{san} ang parolang nagliwanag sa landas.'],
great:[
 'Isang ilaw lang sa makitid na daan;\n{san} ang nakakita at nagligtas ng laban.',
 'Sa gitna ng hamog, isang sinulid ang tanglaw;\n{san} ang sumunod, kaya ligtas ang barko.',
 'Iisang tulay ang tawid sa unos;\n{san} ang tumawid nang buong husay.',
 'Isang daan lang pala ang ligtas;\n{san} ang pinili mo, at tama ka!'],
best:[
 'Ang kompas ay tumuro, ikaw ay sumunod —\n{san} ang piniling galaw ng makina.',
 'Walang mas mabuting agos na matatagpuan;\n{san} ang nagpapanatili sa barko mo sa tamang daan.',
 'Payapang tubig, matatag na kamay;\n{san} ang galaw na ayon sa aking plano.',
 'Buwan at alon ay nagkasundo ngayong gabi:\n{san} ang galaw na tamang-tama.',
 'Ang malalim na agos ay gabay ng matiyaga;\n{san} ang pinakamahusay na mahahanap.'],
excellent:[
 'Halos perlas na, kapiranggot na lang;\n{san} ay mahusay, iwan mo na riyan.',
 'Pilak na kaliskis kung hindi man ginto;\n{san} ay magaling, at matapang pa rin.',
 'Malapit sa pinakamahusay na alon;\n{san} ay hinahayaang dumaloy ang tamang agos.',
 'Banayad na talsik, magandang sisid;\n{san} ay nagpapanatili sa pag-asa mo.'],
book:[
 'Lumang mapa ng dagat, iginuhit noon pa;\n{san} ang daan ng mga maestro talaga.',
 'Lahat ng sinaunang mapa ay may tandang ito;\n{san} ay landas na subok at ligtas.',
 'Dito na naglayag ang mga kapitan noon;\n{san} ay patungo sa mabait na baybayin.',
 'Kilalang katubigan, linya sa linya;\n{san} ay galaw sa aklat, at maganda.'],
good:[
 'Banayad na anod sa agos ng ilog;\n{san} ay maayos, pero hindi pa ang pinakamahusay.',
 'Hindi perlas, ngunit hindi rin bato;\n{san} ay tumatayo, may mas maganda pa lang galaw.',
 'Mahinahong sagwan, dahan-dahan lang;\n{san} ay ayos, pero marami pang matututunan.',
 'Munting alon, maayos at tahimik;\n{san} ay ayos naman, kulang lang nang kaunti.'],
inaccuracy:[
 'Kumakapal ang hamog, ang ilaw ay humihina;\n{san} ay nadulas, may kalamangang nawala.',
 'Isang pabayang kumpas, alon ay kumalat;\n{san} ay hinayaang makatakas ang bentahe.',
 'May lamat sa katawan ng barko;\n{san} ay nagpapatamlay sa kislap mo.',
 'Maluwag ang lambat, tumakas ang isda;\n{san} ay nagpaalpas ng bentahe sa dagat.'],
mistake:[
 'Lumamig ang agos, ang parola ay namatay;\n{san} ay pagkakamali, sayang talaga.',
 'Naligaw ka sa ambon, mali ang tinahak;\n{san} ay hindi ka dadalhin nang malayo.',
 'Naglalaho ang baybayin sa likod ng ulap;\n{san} ay maling liko sa gitna ng gubat ng alon.',
 'May lamat sa ilalim ng kilya;\n{san} ay sugat na matagal gumaling.'],
blunder:[
 'Ibinaba ang angkla, lumulubog ang barko;\n{san} ay bagyo, isang mapait na suntok.',
 'Bagyo ang sumalpok sa madilim na dagat;\n{san} ay pagkawasak, kita ng lahat.',
 'Aba, napunit ang lambat sa dalawa;\n{san} ay nagpatakas sa malaking isda.',
 'Kinuha ng lalim ang mahalagang yaman;\n{san} ay nagpaluha pati sa isdang tulad ko.'],
miss:[
 'Ang perlas ay abot-kamay mo na;\npinalampas mo lang sa tabing-dagat.',
 'Gintong pagkakataon ay lumangoy palayo;\n{san} ay hinayaan itong lumubog sa ilalim.',
 'Nakabukas ang pinto ng pagkakataon;\n{san} ay dumaan lang at lumampas nang malayo.',
 'Isang lihim na agos, malakas at malalim,\nay dumaan, at hinayaan mong makatulog.']
};
var RESULT_TL={
 win:'Naipanalo mo ang dagat, naipanalo mo ang baybayin;\nsa ilalim ako magsasanay, balikan mo ako mamaya.',
 loss:'Malupit ang dagat, walang nahuli sa lambat;\nhuwag mahiya, balik ka at mangisda nang maingat.',
 draw:'Walang lambat ni kawil ang nakahuli;\nang alon ay pumayag na tapusin na ito.'
};
var INTRO_TL={poem:'Payapa ang agos, handa na ang tablero;\ntingnan natin kung ano ang kahihinatnan nito.',
 note:'Ako si Fisher, binabasa ko ang agos ng bawat laro. Lakarin mo ang mga galaw at sasabihin ko kung ano ang bulong ng dagat.'};
var LEVEL_SAYS_TL=[
 'Splash, splash, banayad na simula;\nmedyo lampa ang laro ko, ha.',
 'Mababaw na tubig, maliliit na alon;\nmay mga mali ako, ikaw ay lakasan ang loob.',
 'Masayang langoy, parang pasyal lang;\nhindi ako masyadong magpapahirap.',
 'Kalmado ang klub, maliit ang taya;\npero bantayan pa rin ang mga piyesa.',
 'Bumibilis ang agos, kapit nang mahigpit;\nmay ilang diskarte akong ihahain ngayong gabi.',
 'Ekspertong tubig, malamig at malalim;\nang pabayang galaw ay aking aanihin.',
 'Isang maestro ang umiikot, mahinahon at mabagal;\nisang mahinang parisukat, bagsak ka na.',
 'Grandmaster na unos, mabigat na ulan;\nang pinakamahinang peon ay tiyak babagsak.',
 'Bukas ang kalaliman, patay ang mga ilaw;\nlalaro ako hanggang madaling-araw.'];

var TALK_TL={
 start:{
  low:['Hi! Dahan-dahan lang sa akin, ha?','Magsaya tayo. Nag-aaral pa lang ako!','Take your time. Hindi ako nangangagat.'],
  mid:['Good luck. Handa na ako kapag handa ka na.','Tingnan natin kung ano ang kaya mo.','Sa wakas, tamang laro na.'],
  gm:['Grandmaster ako. Subukan mong huwag matalo agad.','Sana nag-warm up ka muna.','Ipakita mo sa akin ang magandang galaw.'],
  top:['Super GM mode. Wala ka nang pag-asa, pero sige, subukan mo. 😄','Alam ko na kung paano ito matatapos. Pero laruin mo pa rin.','Good luck. Kakailanganin mo ng himala.','Huwag kang mag-alala, walang kahihiyan sa pagkatalo sa akin. Lahat naman natatalo. 😄']},
 botCapture:{
  low:['Oops, may nakuha ako!','Ha, swerte ko.'],
  mid:['Salamat sa piyesa.','Kukunin ko iyan.'],
  gm:['Libreng materyal, salamat.','Akin talaga ang piyesang iyon.'],
  top:['Salamat sa regalo. 😄','Iniwan mo talagang nakabitin iyon?','Isa na naman. Dagdagan mo pa.']},
 botCheck:{
  low:['Tsek! Yata...'],mid:['Tsek!'],gm:['Tsek. Ingat ka.'],
  top:['Tsek. Takbo, munting hari!','Tsek! Saan ka magtatago? 😄']},
 playerCapture:{
  low:['Ang galing mong kumuha!','Naku, nakuha mo ako!'],mid:['Magandang kuha.'],gm:['Hm. Hindi masama.'],
  top:['Sige, swerte lang iyon. Hindi na mauulit.','Mag-enjoy ka habang tumatagal. 😄']},
 playerCheck:{
  low:['Ooh, tsek!'],mid:['Magandang tsek.'],gm:['Tsek? Nakikita ko.'],top:['Cute. Hindi ka maililigtas ng isang tsek.']},
 idle:{
  low:['Wow, ang galing mo!','Sinusubukan ko ang makakaya ko!'],mid:['Ikaw na.','Hm, mahirap ito.'],
  gm:['Interesante. Ituloy mo.','Ingat sa hari mo.'],
  top:['Nag-iisip ka pa? Wala nang magbabago. 😄','Take your time. Pareho pa rin ang resulta.','Pwede ka nang mag-resign anumang oras, alam mo ba. 😉']},
 win:{low:['Whew, nasuwerte ako. Magandang laro!'],mid:['Magandang laro! Rematch?'],gm:['Magandang laro. Bumalik kang mas malakas.'],top:['Sabi ko na nga. 😄 Joke lang, balik ka ha!']},
 lose:{low:['Nakuha mo ako! Ang galing ng laro!'],mid:['Magaling! Rematch?'],gm:['Kahanga-hanga. Bihira itong mangyari.'],top:['Teka, ano?! Hindi ito dapat mangyari. Magaling ka.']},
 draw:{low:['Draw! Magandang laro.'],mid:['Draw. Patas lang.'],gm:['Draw. Tatanggapin ko na.'],top:['Draw?! Swerte mo. 😄']}
};
