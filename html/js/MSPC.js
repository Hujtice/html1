var MPCRule;
function MPCRuleClass()  {

    let factory = dashjs.FactoryMaker;
    let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
    let DashMetrics = factory.getSingletonFactoryByName('DashMetrics');
    let MetricsModel = factory.getSingletonFactoryByName('MetricsModel');
    let StreamController = factory.getSingletonFactoryByName('StreamController');
    let context = this.context;
    let instance;

    let startup=true;
    
    VIDEO_BIT_RATE = [150,400,600,1500,2500,4200];//kbps
    videoHeight = [240,360,480,720,1080,1080];
    videoWidth = [320,480,854,1280,1080,1920];
    const MPC_FUTURE_CHUNK_COUNT = 5;
    const REBUF_PENALTY = 4.3;  // 1 sec rebuffering -> 3 Mbps
    const SMOOTH_PENALTY = 1;
    const DEFAULT_QUALITY = 0;  // default video quality without agent
    const TOTAL_VIDEO_CHUNKS = 299;
    let predictBandwidth, start_delay;
    let last_quality = 0, lastChunkRate=0;
    let last_HTTPRequest;
    let PQArray = new Array();
    let rebufferingArray = new Array();
    let pastQoEArray = new Array();
    let max_reward;
    let start_buffer,last_index=-1;
    let curr_rebuffer_time,bitrate_sum,smoothness_diffs,future_chunk_length;
    let bitrateLength = VIDEO_BIT_RATE.length;
    let qualityList = [];
    const chunkLength = 2;

    let S_INFO = 6;
    let A_DIM = 6;
    let M_IN_K = 1000.0;
    let RESEVOIR = 2;
    let CUSHION = 1 ;


    let PREDICT_STEP = 5;
    let SWITCHPANELTY = 2.6*1e-5;
    let SMOOTH_RATIO_TO_TARGET = 0.5;
    let SLIDING_WINDOW_SIZE = 5
    let DURATION = 4;

    
    //####full_combo是未来5个视频块码率等级的组合，选择是QOE最好的combo
    let full_combo = new Array();

    function setup(){
        for(var i = 0; i<= Math.pow(bitrateLength,5); i++) {
            full_combo[i] = new Array()
        }
        getCombo(bitrateLength)
    }

    function getCombo(length){
        var th1 =0
        var th2 =0
        var th3 =0
        var th4 =0
        var th5 =0
        for(var i = 0;i<Math.pow(length,5);i++) {

            if (th5 >= length) {
                th5 = 0
                th4 = th4 + 1
            }
            full_combo[i][4] = th5
            if (th4 >= length) {
                th4 = 0
                th3 = th3 + 1
            }
            full_combo[i][3] = th4
            if (th3 >= length) {
                th3 = 0
                th2 = th2 + 1
            }
            full_combo[i][2] = th3

            if (th2 >= length) {
                th2 = 0
                th1 = th1 + 1
            }
            full_combo[i][1] = th2
            full_combo[i][0] = th1
            th5 = th5 + 1
        }
    }


    let size_video1=[36503,28175,34675,33127,35345,37361,31343,36839,29808,27187,32210,26419,34344,36182,35951,36999,35112,32975,36155,36680,35313,35101,35423,36912,34990,34235,33228,36990,27113,27073,29154,32621,28044,35867,37200,25651,27873,34754,34850,39433,33347,36077,26588,36661,25347,26092,26244,33388,36504,26159,26547,29705,33048,34181,33060,33184,36382,32663,36920,33433,31936,36011,33119,32514,32299,33161,31880,35042,33487,35939,36979,37500,31992,31537,31158,30950,35184,30555,31286,32085,32783,33029,33330,27777,34798,26055,29074,33000,38215,31127,35182,35783,35473,37705,31527,20695,35522,39102,28910,32121,32491,31315,28057,33515,33932,37231,38092,34381,35207,36164,32660,23474,23426,33107,35313,24943,34687,31225,35726,33684,32661,34063,36736,32142,36607,29188,35832,34184,29909,35633,33620,31119,31067,34889,36869,32093,37213,36135,33218,33579,33369,34499,34122,27043,33974,27912,34809,33617,30754,28316,24766,24373,32852,32040,33100,26375,34255,36960,32422,36514,37949,30106,32203,37519,34315,36627,36355,36482,34920,23132,26598,33427,36485,36954,36296,35968,37179,33627,32641,36615,35889,28943,35892,37120,37500,31371,30459,29198,30002,33209,33980,25579,27458,24499,32333,33149,34682,26589,35608,37543,28109,36621,27029,27889,34038,34451,29442,32012,33561,30931,35906,34573,32995,36222,33413,34179,40327,31703,33987,33734,26496,36381,34962,28713,28601,35610,36234,24355,34353,36762,23082,30275,35272,34624,33607,34656,24330,32935,28545,30092,27787,20803,22290,30221,27256,29823,22904,26629,29319,30645,37233,36262,36222,36993,36126,37283,37161,36579,37238,34674,36781,38063,33346,35702,35660,35478,36020,36023,34757,36595,35015,37275,35285,35378,35014,35404,36035,36634,37223,35529,35598,36207,35871,33528,35468,33258,37723,32930,33480,21373,10355,34380,26472,17317,32964,34765,36144,33782,10002];
    let size_video2=[107145,102413,120985,118787,121311,123445,110365,123205,76600,62926,70244,66165,120967,117998,120231,123119,114237,111871,118901,123592,121970,118686,117268,106568,119809,117405,121123,123431,62759,54221,70976,76809,97767,118043,125363,63101,69518,115569,114623,132260,111195,106966,48745,78124,59326,85283,49113,68679,81770,57720,83784,82277,91882,83459,76665,75251,117396,106964,115176,115208,107167,113454,83292,110694,98833,106922,113828,120485,111964,116637,115305,122704,89814,94845,98557,108046,116579,97864,60975,74578,106078,100547,110826,67483,112294,48190,57569,80642,122779,88695,117577,119401,108691,126790,99185,39556,111297,129242,79596,78491,105875,77557,71036,98390,107769,122373,127402,99526,104842,116374,87693,46839,87861,115224,94359,66909,91968,74960,84658,80442,78809,122061,117759,111246,120089,81959,120633,98684,75965,114341,92175,85181,93364,104269,110008,111098,123838,105469,99879,111039,109028,93023,99204,70102,75820,60871,113372,111894,94817,78980,84780,94919,113575,111348,110359,117128,112208,123613,100082,112817,127044,76619,110227,127838,114626,115098,109992,121661,105046,49416,90588,119166,121640,122315,121694,122969,121473,111370,115281,123223,122328,94740,123337,123458,122990,92768,87646,73481,86781,100034,113150,48286,65863,44002,66394,89988,94102,74895,83007,100314,56837,88074,97046,76631,86726,112182,107896,121793,99584,109814,120291,115474,103593,124129,93802,119896,136672,93081,116806,86434,60872,120546,119567,92579,78502,99515,116229,45989,110189,114486,58979,94385,109933,120621,120702,97271,63095,104652,75328,103206,74795,42373,62154,85196,69621,84211,65660,68898,66326,75063,107742,125327,122872,124173,120418,122173,121343,119248,121851,118461,121936,126333,111950,121360,119107,117672,121089,122679,118040,123084,119792,120501,121650,120591,119101,123333,116346,121921,121199,121618,120166,119088,117117,98858,109372,78152,97750,81416,89166,54382,23181,66956,47498,31739,62581,68572,74536,75487,21062];
    let size_video3=[154928,132944,162029,166637,166496,172969,156665,173430,136185,114022,119750,104402,171230,167452,166731,170488,159804,155108,166032,166376,167379,168112,168272,173058,156593,170228,169773,173115,104595,90329,119480,132674,145171,164185,164573,105266,115853,159345,165738,181244,153179,164146,94915,142304,101360,129791,96073,125644,139151,97029,136516,146814,141577,139875,127391,128058,166081,151910,167656,154713,153630,160159,145964,156652,156421,171911,170920,165025,170279,170366,171132,170085,154145,136257,137655,151885,162634,143745,125960,134456,152434,144185,165227,114825,173538,76102,99426,137718,171618,149396,163701,166873,158699,174764,141034,81920,149510,180814,118411,123333,152868,131321,122425,153290,154955,168396,175824,151765,158223,166405,139736,91514,121413,164214,149329,121487,158228,128811,147260,143185,137440,164683,163564,165505,170026,128628,171524,147870,122457,164258,143217,131791,145414,161042,167960,158655,173740,168565,149500,157064,157806,156958,160277,126850,159495,126940,167978,158730,135319,121958,119873,136752,160336,162519,148305,164488,156750,170671,148742,161402,179081,117110,156812,174723,164372,164065,166780,172139,146899,73711,130972,163024,169944,171508,169250,170383,169064,165136,160953,170875,169296,144268,174359,172728,171361,144416,139663,127050,149719,148891,161036,95027,119771,87072,119480,137277,137999,125422,143193,152936,96587,143453,134928,131931,148422,159495,154064,169873,142468,164520,163197,157157,157834,179761,145300,167089,192276,140962,165252,141030,107268,166117,166880,142077,136015,157326,163352,81163,163190,168252,86080,133670,167785,168832,165142,158781,102652,153985,140355,163105,132920,71539,125221,143779,116932,128483,112053,140335,144675,170951,171124,170026,168121,173385,162474,167497,166792,163430,167713,163813,170230,174679,152471,167940,163676,164315,161049,167229,167538,172747,167081,172341,170368,168022,163801,171428,168422,170290,165559,172343,166987,169254,169246,162969,161086,132471,169716,153019,157945,104675,32136,124173,97422,62681,121510,130580,140088,137437,34429];
    let size_video4=[423649,378823,493013,462182,503492,445284,429911,520907,304466,237900,263815,252958,473841,475091,464752,518104,466331,451961,458661,475786,487070,454178,477877,464098,466875,460358,479396,513057,208088,183387,265513,291784,359094,487267,439893,256977,282505,490906,491191,532136,433156,390116,172861,269975,226546,342363,156010,241172,286465,202607,356776,319316,273965,262385,245921,241038,448890,431671,468958,491181,430914,446152,313542,427725,369257,414412,438638,479553,443540,473407,452939,499428,360849,385435,380602,412105,458534,351166,234345,283427,397285,403844,413804,261900,411853,133933,191935,285806,492872,327209,467089,469061,404202,526470,382147,150777,431665,464150,309962,276245,380539,272612,247138,366624,418267,511279,512491,319795,359573,416162,333861,177460,391301,482098,364378,284102,354977,248175,275608,264585,290965,477964,438332,480231,477693,321743,477058,357001,273604,480735,354636,308605,353308,402136,455337,459847,490093,441813,375629,455531,450073,435042,444965,333224,350298,289431,466442,432454,334581,301352,307118,390387,451900,429211,435120,455109,478763,519298,411715,437369,528451,265433,439447,509264,451692,459138,380959,470940,372020,170735,386843,483141,490948,493240,483991,511183,457558,465282,465030,521125,456819,428105,507066,495615,481300,390272,388969,319280,401306,386443,449055,186217,252466,165256,248566,328570,358499,318433,269989,370182,185217,291179,367562,322287,324866,445549,404316,470960,359487,347122,490132,504831,382789,516114,339774,485066,575450,387970,433192,291977,220862,456563,481670,250186,226284,335183,406268,148045,381105,417104,227548,384759,504975,480035,506834,437716,247909,374528,267997,364676,310349,145947,283399,288376,248911,376916,264489,309524,317560,330515,416195,467921,481270,524985,465527,502263,478511,489520,475563,485966,499606,503911,456597,468785,473005,471714,437699,477645,472096,492374,485432,489550,475727,480954,470183,479232,498060,494260,491681,493013,502436,499329,500559,473847,508679,286422,363102,316519,350102,230905,68272,216469,160552,98009,204017,228908,256526,254420,74837];
    let size_video5=[687687,584133,728318,729904,726602,721845,655778,803113,531376,449319,458408,412495,714258,720935,709197,769023,714184,670386,713336,707575,705572,696435,733454,725648,698101,719409,697523,783949,364753,365991,517966,606593,666217,732398,690878,420882,502935,731103,744234,799894,651622,649909,297742,485336,373809,575339,299232,432776,499318,361845,568239,629612,491707,502508,465948,457144,676232,688539,712280,734779,698433,707846,579051,684793,654926,707498,737576,730903,705678,739681,728574,753309,642146,591119,589565,664984,684903,573934,461547,539695,647931,618481,665562,486245,703431,244502,384810,584897,725004,596913,709561,695198,630883,776566,604461,301246,565572,741504,493292,500737,636698,494756,456740,638719,662256,772689,750568,560962,602892,705649,564051,324303,588025,708992,632302,509669,633982,477880,542165,523568,545961,693943,625271,731925,701193,588198,732988,601559,453661,724881,578807,500716,588681,660585,722173,695585,733489,693042,618662,694436,679135,670226,683360,568431,668039,586064,748726,645583,555538,520514,487273,614396,697266,654533,620702,676133,721548,776461,622505,670940,791479,425364,627459,753384,683837,731247,646593,764242,584208,255623,590798,720669,750114,735880,708473,762766,678074,716378,694543,775206,647346,689891,753655,746163,735147,637975,686325,527514,701182,619066,699083,354673,449662,296888,452856,532538,594427,570361,506582,611493,333317,520328,590665,570365,586239,695075,654592,743020,573284,585811,689254,757972,622761,785650,613252,725266,866702,610636,647330,526107,405760,703916,706199,411130,387517,534953,637554,274262,673955,768317,384940,562126,768985,706871,758749,683234,463055,635520,481747,645321,591655,261358,564222,523585,427036,585156,428386,591392,649978,728515,746875,738594,745734,800208,691016,755932,732491,740986,736061,740090,748908,773208,659956,696085,725672,688565,669000,683253,692405,718110,712140,719047,713407,706157,695550,732177,728473,745492,742091,742208,747013,749605,765020,731390,793661,504749,650878,589804,641129,416256,121915,419552,319933,202439,397227,447489,477888,479687,134828];
    let size_video6=[1046920,1017816,1446864,1802712,2004325,1808906,1707535,1659943,653746,497201,612317,804425,2062793,1917444,1930456,2079264,1892028,1299442,1273222,1144708,1012690,923648,1213005,1155509,1822204,1498808,1397579,1767718,456643,381158,591791,739731,777422,1051073,881632,671331,664135,1340987,1999548,2153133,987079,737910,318233,509584,519406,787350,312925,452508,526282,523193,907426,778451,533572,507533,474181,475531,1074860,907720,1154795,1787471,1219452,924817,647635,1014857,780170,864208,894507,1006425,914689,1025689,941421,1149205,755656,1081644,853692,809226,1166020,727730,481664,617513,1001913,965832,889201,552666,921826,248117,387639,593300,1250941,712212,1168360,1158366,956057,1275630,923852,324936,1504330,1094455,888694,610239,822629,527441,524143,746662,978117,1310115,1632645,640804,701927,791293,661956,400852,1519516,1349274,871343,546508,925912,517165,543625,523567,593955,1900897,1413842,1250752,1107491,705211,1078516,798324,730101,1341636,1008765,687766,718289,905710,1023453,1716269,1971670,1107712,884454,1378061,1253753,1144877,1119394,689745,775614,632569,1111205,979291,713377,910253,1255752,1812667,1688871,1022084,1087218,1085188,1455618,1442795,1112322,1184236,1485657,700714,1137413,1478774,1112633,988679,715407,1008073,784542,423754,1021270,1634174,1986384,1915286,1830354,2139456,1730301,1752368,1554206,2090416,1822277,1255024,2091578,2000158,1843088,1340114,1051178,888253,1037722,928747,966739,388168,506312,323082,487947,692866,755778,827147,545727,920238,363368,540974,925262,797001,778579,938117,792782,955330,716419,669640,1833162,2063204,1019933,1705508,719127,1596512,2264774,964331,1093230,581857,430423,1403805,1469412,473241,442736,708304,785011,293691,748226,925311,589631,1661899,2090335,1775362,1579815,1094665,541354,755828,540361,773942,657076,373841,653782,568568,477191,1263813,640875,656963,688410,733668,925343,1066931,1157344,1425784,1556975,1282720,1224099,1340104,1433735,1426311,1415341,1614953,1462557,1319263,1353201,1583424,1561197,1552306,1306731,1544163,1450092,1437955,1504523,1436431,1525690,1677010,1859305,1982232,1985918,1958743,1817941,1567148,1260519,1037498,1137222,522393,670132,599369,675418,573643,134867,426339,320257,201784,397431,451422,484640,485237,144833];

    function get_chunk_size(quality, mindex){
        if ( mindex < 0 || mindex > 299 ){
            return 0
        }
        let size;
        if(quality==0) {
            size=size_video1[mindex];
        }
        if(quality==1) {
            size=size_video2[mindex];
        }
        if(quality==2) {
            size=size_video3[mindex];
        }
        if(quality==3) {
            size=size_video4[mindex];
        }
        if(quality==4) {
            size=size_video5[mindex];
        }
        if(quality==5) {
            size=size_video6[mindex];
        }
        return size;
    }




    var past_Throughput = [],
    horizon = 5;


    function predict (lastRequested, lastQuality, lastHTTPRequest)
    {//lastRequested==index
        var self = this,
            last_DownloadTime,
            last_Throughput,
            last_ChunkSize,
            future_throughput = [],
            past_Throughput_clone=[],
            band_sum ;


        if (lastHTTPRequest && lastRequested >= 0) {
            if (lastRequested >= 0) {
                last_DownloadTime = (lastHTTPRequest._tfinish - lastHTTPRequest.tresponse) / 1000; //seconds
                last_ChunkSize = get_chunk_size(lastQuality, lastRequested);//B
                last_Throughput = last_ChunkSize / last_DownloadTime / 1000000;//MB/S
                console.log("last_Throughput",last_Throughput);
                //console.log("lastRequested",lastRequested);
                past_Throughput.push(last_Throughput);
                for(var i=0;i<past_Throughput.length;i++)
                    past_Throughput_clone[i]=past_Throughput[i];
                //for(var i=0 ; i<past_Throughput_clone.length ; i++) {
                //    console.log("future_th",past_Throughput_clone[i] );
                //}
                var n=past_Throughput_clone.length;
                //console.log("n",n );
            }
        }
        if (past_Throughput.length == 0) {
           for(var i=0 ; i<PREDICT_STEP ; i++) {
               future_throughput[i] = 0.1;
               //console.log("future_th",future_throughput[i] );
           }
        }
        else {
            if (lastRequested >= 4) {
                for (var j = lastRequested; j < lastRequested + horizon; j++) {
                    band_sum = 0;
                    for (var i = lastRequested - horizon + 1; i <= j; i++) {

                        band_sum += past_Throughput_clone[i];
                    }
                    past_Throughput_clone[j + 1] = band_sum / horizon;
                    future_throughput.push(past_Throughput_clone[j + 1]);
                }
            }
            else {
                for( var j = lastRequested ; j < lastRequested + horizon ; j++ ) {
                     band_sum=0;

                   for(var i = j - n + 1  ; i  <= j; i++) {
                       band_sum = band_sum + past_Throughput_clone[i];
                   }
                   past_Throughput_clone[j+1] = band_sum/n;
               future_throughput.push(past_Throughput_clone[j+1]);
                   if(n<=5)
                       n++;
               }
            }
          //  for(var i=0 ; i<PREDICT_STEP ; i++) {
          //     console.log("future_throughput",future_throughput[i] );
          // }

        }
      return future_throughput;
    }


    /*
    var pastThroughput = [],
    pastDownloadTime = [],
    bandwidthEstLog = [],
    horizon = 5,
    predict = function (lastRequested, lastQuality, lastHTTPRequest) {//lastRequested==index
        var self = this,
        bandwidthEst = 0,
        lastDownloadTime,
        lastThroughput,
        lastChunkSize,
        tmpIndex,
        tmpSum = 0,
        tmpDownloadTime = 0;
        if (lastHTTPRequest && lastRequested >= 0) {
            // self.debug.log("----------ENTERING predictBandwidth, lastHTTPRequest not empty");


            lastDownloadTime = (lastHTTPRequest._tfinish - lastHTTPRequest.tresponse) / 1000; //seconds
            //console.log("lastDownloadTime:"+lastDownloadTime);
            lastChunkSize = get_chunk_size(lastQuality,lastRequested);//B
            lastThroughput = lastChunkSize/lastDownloadTime/1000000;//MB/S
            // Log last chunk

            pastThroughput.push(lastThroughput);
            pastDownloadTime.push(lastDownloadTime);

            // debug
            //console.log("----------BWPredict lastChunk="+lastRequested+", downloadTime="+lastDownloadTime+"s, lastThroughput="+lastThroughput+"kb/s, lastChunkSize="+lastChunkSize);
        }
        // Next, predict future bandwidth
        if (pastThroughput.length === 0) {
            return 0.1;
        } else {
            tmpIndex = Math.max(0, pastThroughput.length - horizon);
            tmpSum = 0;
            tmpDownloadTime = 0;
            for (var i = tmpIndex; i < pastThroughput.length; i++) {
                tmpSum = tmpSum + pastDownloadTime[i] / pastThroughput[i];
                tmpDownloadTime = tmpDownloadTime + pastDownloadTime[i];
            }
            bandwidthEst = tmpDownloadTime/tmpSum;

            bandwidthEstLog[lastRequested] = bandwidthEst;

            return bandwidthEst;
        }
    }
     */


    function quantization(c_bit_rate) {
    var self = this,
        max_level,
        min_bit_rate,
        max_bit_rate,
        rate,
         c_bit_rate = c_bit_rate*1000;
         max_level = VIDEO_BIT_RATE.length-1;
         min_bit_rate = VIDEO_BIT_RATE[0];
         max_bit_rate = VIDEO_BIT_RATE[5];
    if(c_bit_rate >= max_bit_rate)
         rate = max_level;
    else {
        for(var i=0 ; i <= max_level;i++ )
            if (c_bit_rate < VIDEO_BIT_RATE[i + 1])
                rate = i;
    }
    return rate
    }

    //二阶矩阵相乘
    function multiply(a, b) {
    // 相乘约束
    let m = a.length;
    let p = a[0].length;
    let n = b[0].length;

    // 初始化 m*n 全 0 二维数组
    let c = new Array(m).fill(0).map(arr => new Array(n).fill(0));
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            for (let k = 0; k < p; k++) {
                c[i][j] += a[i][k] * b[k][j];
            }
        }
    }
    return c;
}
function det(square) {
    // 方阵约束
    if (square.length !== square[0].length) {
        throw new Error();
    }
    // 方阵阶数
    let n = square.length;

    let result = 0;
    if (n > 3) {
        // n 阶
        for (let column = 0; column < n; column++) {
            // 去掉第 0 行第 column 列的矩阵
            let matrix = new Array(n - 1).fill(0).map(arr => new Array(n - 1).fill(0));
            for (let i = 0; i < n - 1; i++) {
                for (let j = 0; j < n - 1; j++) {
                    if (j < column) {
                        matrix[i][j] = square[i + 1][j];
                    } else {
                        matrix[i][j] = square[i + 1][j + 1];
                    }
                }
            }
            result += square[0][column] * Math.pow(-1, 0 + column) * det(matrix);
        }
    } else if (n === 3) {
        // 3 阶
        result = square[0][0] * square[1][1] * square[2][2] +
                 square[0][1] * square[1][2] * square[2][0] +
                 square[0][2] * square[1][0] * square[2][1] -
                 square[0][2] * square[1][1] * square[2][0] -
                 square[0][1] * square[1][0] * square[2][2] -
                 square[0][0] * square[1][2] * square[2][1];
    } else if (n === 2) {
        // 2 阶
        result = square[0][0] * square[1][1] - square[0][1] * square[1][0];
    } else if (n === 1) {
        // 1 阶
        result = square[0][0];
    }
    return result;
}

function adjoint(square) {
    // 方阵约束
    if (square[0].length !== square.length) {
        throw new Error();
    }

    let n = square.length;

    let result = new Array(n).fill(0).map(arr => new Array(n).fill(0));
    for (let row = 0; row < n; row++) {
        for (let column = 0; column < n; column++) {
            // 去掉第 row 行第 column 列的矩阵
            let matrix = [];
            for (let i = 0; i < square.length; i++) {
                if (i !== row) {
                    let arr = [];
                    for (let j = 0; j < square.length; j++) {
                        if (j !== column) {
                            arr.push(square[i][j]);
                        }
                    }
                    matrix.push(arr);
                }
            }
            result[row][column] = Math.pow(-1, row + column) * det(matrix);
        }
    }
    return transpose(result);
}

//逆矩阵
    function inv(square) {
    if (square[0].length !== square.length) {
        throw new Error();
    }
    let detValue = det(square);
    let result = adjoint(square);

    for (let i = 0; i < result.length; i++) {
        for (let j = 0; j < result.length; j++) {
            result[i][j] /= detValue;
        }
    }
    return result;
}

var last_buffer=[],
    QoE_sum=0;
//矩阵转置
function transpose(matrix) {
    let result = new Array(matrix.length).fill(0).map(arr => new Array(matrix[0].length).fill(0));
    for (let i = 0; i < result.length; i++) {
        for (let j = 0; j < result[0].length; j++) {
            result[i][j] = matrix[j][i];
        }
    }
    return result;
}

    function getMaxIndex(rulesContext){
        const mediaType = rulesContext.getMediaInfo().type;
        var dashMetrics = DashMetrics(context).getInstance();
        const switchRequest = SwitchRequest(context).create();

        
        if(mediaType=='video'){
            if (last_index < 0 ){
                switchRequest.quality = 0;
                last_index ++;
	         	qualityList.push(0);
                return switchRequest;
            }
            //last_index = curr_index;
            last_HTTPRequest=dashMetrics.getCurrentHttpRequest('video');
            //predict
            start_buffer = dashMetrics.getCurrentBufferLevel("video", true);
            console.log("buffer",start_buffer);
            last_buffer.push(start_buffer);
            var  future_bandwidth;
            future_bandwidth = predict(last_index, last_quality, last_HTTPRequest);//MB/S
            //console.log("length",future_bandwidth);
            //for(var i=0 ;  i < future_bandwidth.length ; i++)
                //console.log("future_bandwidth",future_bandwidth[i]);

            //getPredictionError(last_index);

            future_chunk_length = MPC_FUTURE_CHUNK_COUNT;
            if ( TOTAL_VIDEO_CHUNKS - last_index < 5 ){
                future_chunk_length = TOTAL_VIDEO_CHUNKS - last_index;
            }

            let start_delay;
            let best_combo=[];

            let quality,curr_buffer,chunk_quality,index,send_data;
            quality=last_quality;

            //MSPC
             let RANDOM_SEED=Math.random()  ;   //生成随机数
            // console.log("random_seed",RANDOM_SEED);


            let switch_penalty_array = new Array(PREDICT_STEP).fill(0).map(arr => new Array(PREDICT_STEP).fill(0));
          for(var i =0;i< PREDICT_STEP;i++){
                   switch_penalty_array[i][i]=SWITCHPANELTY * ( PREDICT_STEP - i );
          }
             // console.log("switch_penalty_array[i][i]",switch_penalty_array[0][0]);
          //matrix initialization
          // 缓存量预测所需计算G和F，第一项取决于当前的缓存量 ，第二部份由未来的码率决策所决定。
               // 斜三角
              //matrix_F = [],      //[5,5]
               // matrix_G = [];      //[5,2]
         let matrix_E = new Array(PREDICT_STEP).fill(0).map(arr => new Array(PREDICT_STEP).fill(0));
          for(var i =0;i< PREDICT_STEP;i++){
              for(var j=0;j<i+1;j++){
                  matrix_E[i][j]=i-j+1;
                 // console.log("matrix_E",matrix_E[0][0]);
            }
          }

          let matrix_G = new Array(PREDICT_STEP).fill(0).map(arr => new Array(2).fill(0));
          for(var i =0; i< PREDICT_STEP ;i++){
                 matrix_G[i][0]= i+2;
                 matrix_G[i][1]= -i-1;
                // console.log("matrix_G",matrix_G[0][0]);
          }

          var  TARGET_BUFFER = 8,
               target_buffer_array=[];

          let br = new Array(PREDICT_STEP+1).fill(0).map(arr => new Array(1).fill(0));
          for(var i =0; i< PREDICT_STEP ; i++){
              br[0][0] = start_buffer;
              br[i+1][0] = SMOOTH_RATIO_TO_TARGET*br[i][0] + ( 1-SMOOTH_RATIO_TO_TARGET ) * TARGET_BUFFER;
              //console.log("br",br[0][0]);
              target_buffer_array.push(br[i+1][0]);
              //console.log("target_buffer_array",target_buffer_array[0]);
            }

          //F计算   -（L/estimated_throughput）.dot矩阵乘  .diag
         let matrix_F = new Array(PREDICT_STEP).fill(0).map(arr => new Array(PREDICT_STEP).fill(0));
           for(var i=0 ; i < PREDICT_STEP ; i++)
               for( var j=0 ;j < i+1;j++) {
                   matrix_F[i][j] = matrix_E[i][j] * (-DURATION / future_bandwidth[j]);
                  // console.log("matrix_F",matrix_E[i][j] * (-DURATION / future_bandwidth[j]));
                   //matrix_F[i][j] = matrix_E[i][j] * (-DURATION / future_bandwidth);
                   //console.log("matrix_F",matrix_E[0][0] * (-DURATION / future_bandwidth));
               }
          //码率变化计算

          //矩阵F的转置    matrix_F_T
          let matrix_F_T = new Array(PREDICT_STEP).fill(0).map(arr => new Array(PREDICT_STEP).fill(0));
          matrix_F_T=transpose(matrix_F);
          //console.log("matrix_F_T",matrix_F_T[0][0]);

          //矩阵F和转置相乘 matrix_F_F_T
          let matrix_F_F_T = new Array(PREDICT_STEP).fill(0).map(arr => new Array(PREDICT_STEP).fill(0));
          matrix_F_F_T=multiply(matrix_F_T,matrix_F);
         // console.log("matrix_F_F_T",matrix_F_F_T[0][0]);

          //乘积array相加  matrix_F_F_T_array
          let matrix_F_F_T_array = new Array(PREDICT_STEP).fill(0).map(arr => new Array(PREDICT_STEP).fill(0));
          for(var i=0 ; i<matrix_F_F_T.length ; i++)
              for(var j=0 ; j<matrix_F_F_T[0].length ; j++)
                    matrix_F_F_T_array[i][j]=matrix_F_F_T[i][j]+switch_penalty_array[i][j];

          //console.log("matrix_F_F_T_array",matrix_F_F_T_array[0][0]);
          //乘积做逆矩阵




          let matrix_ni = new Array(PREDICT_STEP).fill(0).map(arr => new Array(PREDICT_STEP).fill(0));
          let bk = new Array(2).fill(0).map(arr => new Array(1).fill(0));
          let matrix_aaa = new Array(5).fill(0).map(arr => new Array(1).fill(0));

          matrix_ni=inv(matrix_F_F_T_array);

          //console.log("matrix_ni",matrix_ni[0][0]);

            bk[0][0]=start_buffer;
            if(last_index == 0)
                bk[1][0]=start_buffer;
            else
                bk[1][0]=last_buffer[last_index-1];
          matrix_aaa=multiply(matrix_G,bk);    //[5][2]*[2][1] =[5][1]

          //console.log("matrix_aaa",matrix_aaa[0][0]);

          let matrix_o = new Array(PREDICT_STEP).fill(0).map(arr => new Array(PREDICT_STEP).fill(0));
          matrix_o=multiply(matrix_ni,matrix_F_T);  //[5][5]
          //console.log("matrix_o",matrix_o[0][0]);

          let matrix = new Array(5).fill(0).map(arr => new Array(1).fill(0));
          for(var i=0 ; i < target_buffer_array.length ; i++  )
              matrix[i][0]=target_buffer_array[i]-matrix_aaa[i][0];   //[5][1]
         //console.log("matrix",matrix[0][0]);

          let rate_change_array = new Array(5).fill(0).map(arr => new Array(1).fill(0));
         rate_change_array=multiply(matrix_o,matrix);   //[5][1]
           // console.log("length1111",rate_change_array.length);
           // for(i=0;i<rate_change_array.length;i++) {
            console.log("rate_change", rate_change_array[0][0]);
           // }
          //选择码率不超过target_rate
          let target_rate = VIDEO_BIT_RATE[last_quality]/1000 + rate_change_array[0][0];
          //console.log("target_rate",target_rate);
          //quantizayion

          var bit_rate;
          bit_rate = quantization(target_rate);
          console.log("c_bitrate",bit_rate);

         if( last_index > 1 ) {
             if (bit_rate - last_quality > 1)
                 bit_rate = last_quality + 1;
             else if (bit_rate - last_quality < -1 )
                 bit_rate = last_quality - 1;
         }
           console.log("cur_bitrate",bit_rate);
            //calculate the QoE of the last chunk
            var lastChunkRebuffering = dashMetrics.calculateRebufferTime() / 1000;
            console.log("lastRebuffering",lastChunkRebuffering );
            //rebufferingArray.push(lastChunkRebuffering);
            //pastQoEArray.push( VIDEO_BIT_RATE[last_quality]+VIDEO_BIT_RATE[send_data]-beta*Math.abs(VIDEO_BIT_RATE[last_quality]-VIDEO_BIT_RATE[send_data])-deta * lastChunkRebuffering );
            // console.log("lastQoE",pastQoEArray[last_index] );
            last_index += 1;
            console.log("index",last_index);

            switchRequest.quality = bit_rate;
            switchRequest.priority = 1;
            console.log("select quality:"+bit_rate)
            last_quality=bit_rate;
            qualityList.push(bit_rate);
            //console.log(" qualityList", qualityList[last_index-1]);

            //qoe caluate
            var   beta=1,
                  deta=1;
            if(last_index>0)
               QoE_sum += get_chunk_size(last_quality,last_index)/1000000+beta*(VIDEO_BIT_RATE[last_quality]/1000-VIDEO_BIT_RATE[qualityList[last_index]]/1000)-deta*lastChunkRebuffering;
            console.log("QoE",QoE_sum);

        }
        else
            {//####音频的，只有一个码率，直接选择
            switchRequest.quality = 0;
        }
        return switchRequest;
    }

    function reset(){}
    instance={
        getMaxIndex:getMaxIndex,
        reset:reset
    };
    setup();
    return instance;

}

MPCRuleClass.__dashjs_factory_name = 'MPCRule';
MPCRule = dashjs.FactoryMaker.getClassFactory(MPCRuleClass);
