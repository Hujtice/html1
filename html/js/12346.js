var MPCRule;
function MPCRuleClass() {

    let factory = dashjs.FactoryMaker;
    let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
    let DashMetrics = factory.getSingletonFactoryByName('DashMetrics');
    let MetricsModel = factory.getSingletonFactoryByName('MetricsModel');
    let StreamController = factory.getSingletonFactoryByName('StreamController');
    let context = this.context;
    let instance;
    var bugout = new debugout();

    let startup = true;

    VIDEO_BIT_RATE = [150, 400, 600, 1500, 2500, 4200];//kbps
    videoHeight = [240, 360, 480, 720, 1080, 1080];
    videoWidth = [320, 480, 854, 1280, 1080, 1920];
    const MPC_FUTURE_CHUNK_COUNT = 5;
    const REBUF_PENALTY = 4.3;  // 1 sec rebuffering -> 3 Mbps
    const SMOOTH_PENALTY = 1;
    const DEFAULT_QUALITY = 1;  // default video quality without agent
    const TOTAL_VIDEO_CHUNKS = 299;
    let m_sigma = 0.1;
    let start_delay;
    let last_quality =0, lastChunkRate = 0;
    let last_HTTPRequest;
    let PQArray = new Array();
    let rebufferingArray = new Array();
    let pastQoEArray = new Array();
    let max_reward;
    let start_buffer, last_index = -1;
    let curr_rebuffer_time, bitrate_sum, smoothness_diffs, future_chunk_length;
    let bitrateLength = VIDEO_BIT_RATE.length;
    let qualityList = [];
    const chunkLength = 2;


    //####full_combo是未来5个视频块码率等级的组合，选择是QOE最好的combo
    let full_combo = new Array();

    function setup() {
        for (var i = 0; i <= Math.pow(bitrateLength, 5); i++) {
            full_combo[i] = new Array()
        }
        getCombo(bitrateLength)
    }

    function getCombo(length) {
        var th1 = 0
        var th2 = 0
        var th3 = 0
        var th4 = 0
        var th5 = 0
        for (var i = 0; i < Math.pow(length, 5); i++) {

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


    let size_video1 = [36503, 28175, 34675, 33127, 35345, 37361, 31343, 36839, 29808, 27187, 32210, 26419, 34344, 36182, 35951, 36999, 35112, 32975, 36155, 36680, 35313, 35101, 35423, 36912, 34990, 34235, 33228, 36990, 27113, 27073, 29154, 32621, 28044, 35867, 37200, 25651, 27873, 34754, 34850, 39433, 33347, 36077, 26588, 36661, 25347, 26092, 26244, 33388, 36504, 26159, 26547, 29705, 33048, 34181, 33060, 33184, 36382, 32663, 36920, 33433, 31936, 36011, 33119, 32514, 32299, 33161, 31880, 35042, 33487, 35939, 36979, 37500, 31992, 31537, 31158, 30950, 35184, 30555, 31286, 32085, 32783, 33029, 33330, 27777, 34798, 26055, 29074, 33000, 38215, 31127, 35182, 35783, 35473, 37705, 31527, 20695, 35522, 39102, 28910, 32121, 32491, 31315, 28057, 33515, 33932, 37231, 38092, 34381, 35207, 36164, 32660, 23474, 23426, 33107, 35313, 24943, 34687, 31225, 35726, 33684, 32661, 34063, 36736, 32142, 36607, 29188, 35832, 34184, 29909, 35633, 33620, 31119, 31067, 34889, 36869, 32093, 37213, 36135, 33218, 33579, 33369, 34499, 34122, 27043, 33974, 27912, 34809, 33617, 30754, 28316, 24766, 24373, 32852, 32040, 33100, 26375, 34255, 36960, 32422, 36514, 37949, 30106, 32203, 37519, 34315, 36627, 36355, 36482, 34920, 23132, 26598, 33427, 36485, 36954, 36296, 35968, 37179, 33627, 32641, 36615, 35889, 28943, 35892, 37120, 37500, 31371, 30459, 29198, 30002, 33209, 33980, 25579, 27458, 24499, 32333, 33149, 34682, 26589, 35608, 37543, 28109, 36621, 27029, 27889, 34038, 34451, 29442, 32012, 33561, 30931, 35906, 34573, 32995, 36222, 33413, 34179, 40327, 31703, 33987, 33734, 26496, 36381, 34962, 28713, 28601, 35610, 36234, 24355, 34353, 36762, 23082, 30275, 35272, 34624, 33607, 34656, 24330, 32935, 28545, 30092, 27787, 20803, 22290, 30221, 27256, 29823, 22904, 26629, 29319, 30645, 37233, 36262, 36222, 36993, 36126, 37283, 37161, 36579, 37238, 34674, 36781, 38063, 33346, 35702, 35660, 35478, 36020, 36023, 34757, 36595, 35015, 37275, 35285, 35378, 35014, 35404, 36035, 36634, 37223, 35529, 35598, 36207, 35871, 33528, 35468, 33258, 37723, 32930, 33480, 21373, 10355, 34380, 26472, 17317, 32964, 34765, 36144, 33782, 10002];
    let size_video2 = [107145, 102413, 120985, 118787, 121311, 123445, 110365, 123205, 76600, 62926, 70244, 66165, 120967, 117998, 120231, 123119, 114237, 111871, 118901, 123592, 121970, 118686, 117268, 106568, 119809, 117405, 121123, 123431, 62759, 54221, 70976, 76809, 97767, 118043, 125363, 63101, 69518, 115569, 114623, 132260, 111195, 106966, 48745, 78124, 59326, 85283, 49113, 68679, 81770, 57720, 83784, 82277, 91882, 83459, 76665, 75251, 117396, 106964, 115176, 115208, 107167, 113454, 83292, 110694, 98833, 106922, 113828, 120485, 111964, 116637, 115305, 122704, 89814, 94845, 98557, 108046, 116579, 97864, 60975, 74578, 106078, 100547, 110826, 67483, 112294, 48190, 57569, 80642, 122779, 88695, 117577, 119401, 108691, 126790, 99185, 39556, 111297, 129242, 79596, 78491, 105875, 77557, 71036, 98390, 107769, 122373, 127402, 99526, 104842, 116374, 87693, 46839, 87861, 115224, 94359, 66909, 91968, 74960, 84658, 80442, 78809, 122061, 117759, 111246, 120089, 81959, 120633, 98684, 75965, 114341, 92175, 85181, 93364, 104269, 110008, 111098, 123838, 105469, 99879, 111039, 109028, 93023, 99204, 70102, 75820, 60871, 113372, 111894, 94817, 78980, 84780, 94919, 113575, 111348, 110359, 117128, 112208, 123613, 100082, 112817, 127044, 76619, 110227, 127838, 114626, 115098, 109992, 121661, 105046, 49416, 90588, 119166, 121640, 122315, 121694, 122969, 121473, 111370, 115281, 123223, 122328, 94740, 123337, 123458, 122990, 92768, 87646, 73481, 86781, 100034, 113150, 48286, 65863, 44002, 66394, 89988, 94102, 74895, 83007, 100314, 56837, 88074, 97046, 76631, 86726, 112182, 107896, 121793, 99584, 109814, 120291, 115474, 103593, 124129, 93802, 119896, 136672, 93081, 116806, 86434, 60872, 120546, 119567, 92579, 78502, 99515, 116229, 45989, 110189, 114486, 58979, 94385, 109933, 120621, 120702, 97271, 63095, 104652, 75328, 103206, 74795, 42373, 62154, 85196, 69621, 84211, 65660, 68898, 66326, 75063, 107742, 125327, 122872, 124173, 120418, 122173, 121343, 119248, 121851, 118461, 121936, 126333, 111950, 121360, 119107, 117672, 121089, 122679, 118040, 123084, 119792, 120501, 121650, 120591, 119101, 123333, 116346, 121921, 121199, 121618, 120166, 119088, 117117, 98858, 109372, 78152, 97750, 81416, 89166, 54382, 23181, 66956, 47498, 31739, 62581, 68572, 74536, 75487, 21062];
    let size_video3 = [154928, 132944, 162029, 166637, 166496, 172969, 156665, 173430, 136185, 114022, 119750, 104402, 171230, 167452, 166731, 170488, 159804, 155108, 166032, 166376, 167379, 168112, 168272, 173058, 156593, 170228, 169773, 173115, 104595, 90329, 119480, 132674, 145171, 164185, 164573, 105266, 115853, 159345, 165738, 181244, 153179, 164146, 94915, 142304, 101360, 129791, 96073, 125644, 139151, 97029, 136516, 146814, 141577, 139875, 127391, 128058, 166081, 151910, 167656, 154713, 153630, 160159, 145964, 156652, 156421, 171911, 170920, 165025, 170279, 170366, 171132, 170085, 154145, 136257, 137655, 151885, 162634, 143745, 125960, 134456, 152434, 144185, 165227, 114825, 173538, 76102, 99426, 137718, 171618, 149396, 163701, 166873, 158699, 174764, 141034, 81920, 149510, 180814, 118411, 123333, 152868, 131321, 122425, 153290, 154955, 168396, 175824, 151765, 158223, 166405, 139736, 91514, 121413, 164214, 149329, 121487, 158228, 128811, 147260, 143185, 137440, 164683, 163564, 165505, 170026, 128628, 171524, 147870, 122457, 164258, 143217, 131791, 145414, 161042, 167960, 158655, 173740, 168565, 149500, 157064, 157806, 156958, 160277, 126850, 159495, 126940, 167978, 158730, 135319, 121958, 119873, 136752, 160336, 162519, 148305, 164488, 156750, 170671, 148742, 161402, 179081, 117110, 156812, 174723, 164372, 164065, 166780, 172139, 146899, 73711, 130972, 163024, 169944, 171508, 169250, 170383, 169064, 165136, 160953, 170875, 169296, 144268, 174359, 172728, 171361, 144416, 139663, 127050, 149719, 148891, 161036, 95027, 119771, 87072, 119480, 137277, 137999, 125422, 143193, 152936, 96587, 143453, 134928, 131931, 148422, 159495, 154064, 169873, 142468, 164520, 163197, 157157, 157834, 179761, 145300, 167089, 192276, 140962, 165252, 141030, 107268, 166117, 166880, 142077, 136015, 157326, 163352, 81163, 163190, 168252, 86080, 133670, 167785, 168832, 165142, 158781, 102652, 153985, 140355, 163105, 132920, 71539, 125221, 143779, 116932, 128483, 112053, 140335, 144675, 170951, 171124, 170026, 168121, 173385, 162474, 167497, 166792, 163430, 167713, 163813, 170230, 174679, 152471, 167940, 163676, 164315, 161049, 167229, 167538, 172747, 167081, 172341, 170368, 168022, 163801, 171428, 168422, 170290, 165559, 172343, 166987, 169254, 169246, 162969, 161086, 132471, 169716, 153019, 157945, 104675, 32136, 124173, 97422, 62681, 121510, 130580, 140088, 137437, 34429];
    let size_video4 = [423649, 378823, 493013, 462182, 503492, 445284, 429911, 520907, 304466, 237900, 263815, 252958, 473841, 475091, 464752, 518104, 466331, 451961, 458661, 475786, 487070, 454178, 477877, 464098, 466875, 460358, 479396, 513057, 208088, 183387, 265513, 291784, 359094, 487267, 439893, 256977, 282505, 490906, 491191, 532136, 433156, 390116, 172861, 269975, 226546, 342363, 156010, 241172, 286465, 202607, 356776, 319316, 273965, 262385, 245921, 241038, 448890, 431671, 468958, 491181, 430914, 446152, 313542, 427725, 369257, 414412, 438638, 479553, 443540, 473407, 452939, 499428, 360849, 385435, 380602, 412105, 458534, 351166, 234345, 283427, 397285, 403844, 413804, 261900, 411853, 133933, 191935, 285806, 492872, 327209, 467089, 469061, 404202, 526470, 382147, 150777, 431665, 464150, 309962, 276245, 380539, 272612, 247138, 366624, 418267, 511279, 512491, 319795, 359573, 416162, 333861, 177460, 391301, 482098, 364378, 284102, 354977, 248175, 275608, 264585, 290965, 477964, 438332, 480231, 477693, 321743, 477058, 357001, 273604, 480735, 354636, 308605, 353308, 402136, 455337, 459847, 490093, 441813, 375629, 455531, 450073, 435042, 444965, 333224, 350298, 289431, 466442, 432454, 334581, 301352, 307118, 390387, 451900, 429211, 435120, 455109, 478763, 519298, 411715, 437369, 528451, 265433, 439447, 509264, 451692, 459138, 380959, 470940, 372020, 170735, 386843, 483141, 490948, 493240, 483991, 511183, 457558, 465282, 465030, 521125, 456819, 428105, 507066, 495615, 481300, 390272, 388969, 319280, 401306, 386443, 449055, 186217, 252466, 165256, 248566, 328570, 358499, 318433, 269989, 370182, 185217, 291179, 367562, 322287, 324866, 445549, 404316, 470960, 359487, 347122, 490132, 504831, 382789, 516114, 339774, 485066, 575450, 387970, 433192, 291977, 220862, 456563, 481670, 250186, 226284, 335183, 406268, 148045, 381105, 417104, 227548, 384759, 504975, 480035, 506834, 437716, 247909, 374528, 267997, 364676, 310349, 145947, 283399, 288376, 248911, 376916, 264489, 309524, 317560, 330515, 416195, 467921, 481270, 524985, 465527, 502263, 478511, 489520, 475563, 485966, 499606, 503911, 456597, 468785, 473005, 471714, 437699, 477645, 472096, 492374, 485432, 489550, 475727, 480954, 470183, 479232, 498060, 494260, 491681, 493013, 502436, 499329, 500559, 473847, 508679, 286422, 363102, 316519, 350102, 230905, 68272, 216469, 160552, 98009, 204017, 228908, 256526, 254420, 74837];
    let size_video5 = [687687, 584133, 728318, 729904, 726602, 721845, 655778, 803113, 531376, 449319, 458408, 412495, 714258, 720935, 709197, 769023, 714184, 670386, 713336, 707575, 705572, 696435, 733454, 725648, 698101, 719409, 697523, 783949, 364753, 365991, 517966, 606593, 666217, 732398, 690878, 420882, 502935, 731103, 744234, 799894, 651622, 649909, 297742, 485336, 373809, 575339, 299232, 432776, 499318, 361845, 568239, 629612, 491707, 502508, 465948, 457144, 676232, 688539, 712280, 734779, 698433, 707846, 579051, 684793, 654926, 707498, 737576, 730903, 705678, 739681, 728574, 753309, 642146, 591119, 589565, 664984, 684903, 573934, 461547, 539695, 647931, 618481, 665562, 486245, 703431, 244502, 384810, 584897, 725004, 596913, 709561, 695198, 630883, 776566, 604461, 301246, 565572, 741504, 493292, 500737, 636698, 494756, 456740, 638719, 662256, 772689, 750568, 560962, 602892, 705649, 564051, 324303, 588025, 708992, 632302, 509669, 633982, 477880, 542165, 523568, 545961, 693943, 625271, 731925, 701193, 588198, 732988, 601559, 453661, 724881, 578807, 500716, 588681, 660585, 722173, 695585, 733489, 693042, 618662, 694436, 679135, 670226, 683360, 568431, 668039, 586064, 748726, 645583, 555538, 520514, 487273, 614396, 697266, 654533, 620702, 676133, 721548, 776461, 622505, 670940, 791479, 425364, 627459, 753384, 683837, 731247, 646593, 764242, 584208, 255623, 590798, 720669, 750114, 735880, 708473, 762766, 678074, 716378, 694543, 775206, 647346, 689891, 753655, 746163, 735147, 637975, 686325, 527514, 701182, 619066, 699083, 354673, 449662, 296888, 452856, 532538, 594427, 570361, 506582, 611493, 333317, 520328, 590665, 570365, 586239, 695075, 654592, 743020, 573284, 585811, 689254, 757972, 622761, 785650, 613252, 725266, 866702, 610636, 647330, 526107, 405760, 703916, 706199, 411130, 387517, 534953, 637554, 274262, 673955, 768317, 384940, 562126, 768985, 706871, 758749, 683234, 463055, 635520, 481747, 645321, 591655, 261358, 564222, 523585, 427036, 585156, 428386, 591392, 649978, 728515, 746875, 738594, 745734, 800208, 691016, 755932, 732491, 740986, 736061, 740090, 748908, 773208, 659956, 696085, 725672, 688565, 669000, 683253, 692405, 718110, 712140, 719047, 713407, 706157, 695550, 732177, 728473, 745492, 742091, 742208, 747013, 749605, 765020, 731390, 793661, 504749, 650878, 589804, 641129, 416256, 121915, 419552, 319933, 202439, 397227, 447489, 477888, 479687, 134828];
    let size_video6 = [1046920, 1017816, 1446864, 1802712, 2004325, 1808906, 1707535, 1659943, 653746, 497201, 612317, 804425, 2062793, 1917444, 1930456, 2079264, 1892028, 1299442, 1273222, 1144708, 1012690, 923648, 1213005, 1155509, 1822204, 1498808, 1397579, 1767718, 456643, 381158, 591791, 739731, 777422, 1051073, 881632, 671331, 664135, 1340987, 1999548, 2153133, 987079, 737910, 318233, 509584, 519406, 787350, 312925, 452508, 526282, 523193, 907426, 778451, 533572, 507533, 474181, 475531, 1074860, 907720, 1154795, 1787471, 1219452, 924817, 647635, 1014857, 780170, 864208, 894507, 1006425, 914689, 1025689, 941421, 1149205, 755656, 1081644, 853692, 809226, 1166020, 727730, 481664, 617513, 1001913, 965832, 889201, 552666, 921826, 248117, 387639, 593300, 1250941, 712212, 1168360, 1158366, 956057, 1275630, 923852, 324936, 1504330, 1094455, 888694, 610239, 822629, 527441, 524143, 746662, 978117, 1310115, 1632645, 640804, 701927, 791293, 661956, 400852, 1519516, 1349274, 871343, 546508, 925912, 517165, 543625, 523567, 593955, 1900897, 1413842, 1250752, 1107491, 705211, 1078516, 798324, 730101, 1341636, 1008765, 687766, 718289, 905710, 1023453, 1716269, 1971670, 1107712, 884454, 1378061, 1253753, 1144877, 1119394, 689745, 775614, 632569, 1111205, 979291, 713377, 910253, 1255752, 1812667, 1688871, 1022084, 1087218, 1085188, 1455618, 1442795, 1112322, 1184236, 1485657, 700714, 1137413, 1478774, 1112633, 988679, 715407, 1008073, 784542, 423754, 1021270, 1634174, 1986384, 1915286, 1830354, 2139456, 1730301, 1752368, 1554206, 2090416, 1822277, 1255024, 2091578, 2000158, 1843088, 1340114, 1051178, 888253, 1037722, 928747, 966739, 388168, 506312, 323082, 487947, 692866, 755778, 827147, 545727, 920238, 363368, 540974, 925262, 797001, 778579, 938117, 792782, 955330, 716419, 669640, 1833162, 2063204, 1019933, 1705508, 719127, 1596512, 2264774, 964331, 1093230, 581857, 430423, 1403805, 1469412, 473241, 442736, 708304, 785011, 293691, 748226, 925311, 589631, 1661899, 2090335, 1775362, 1579815, 1094665, 541354, 755828, 540361, 773942, 657076, 373841, 653782, 568568, 477191, 1263813, 640875, 656963, 688410, 733668, 925343, 1066931, 1157344, 1425784, 1556975, 1282720, 1224099, 1340104, 1433735, 1426311, 1415341, 1614953, 1462557, 1319263, 1353201, 1583424, 1561197, 1552306, 1306731, 1544163, 1450092, 1437955, 1504523, 1436431, 1525690, 1677010, 1859305, 1982232, 1985918, 1958743, 1817941, 1567148, 1260519, 1037498, 1137222, 522393, 670132, 599369, 675418, 573643, 134867, 426339, 320257, 201784, 397431, 451422, 484640, 485237, 144833];

    function get_chunk_size(quality, mindex) {
        if (mindex < 0 || mindex > 299) {
            return 0
        }
        let size;
        if (quality == 0) {
            size = size_video1[mindex];
        }
        if (quality == 1) {
            size = size_video2[mindex];
        }

        if (quality == 2) {
            size = size_video3[mindex];
        }
        if (quality == 3) {
            size = size_video4[mindex];
        }
        if (quality == 4) {
            size = size_video5[mindex];
        }
        if (quality == 5) {
            size = size_video6[mindex];
        }
        return size;
    }


    var past_Throughput = [],
        beta = 1,
        deta = 3,
        past_DownloadTime = [],
        last_W = [],
        last_Y = [],
        past_Bufferlevel=[],
        past_Bufferleveling = [],
        bandwidthEstLog = [],
        cur_bufferleveling = [],
        past_HTTPrequested_start_time = [],
        past_HTTPrequested_end_time = [],
        last_P = [],
        last_W = [],
        last_Q = [],
        last_Y = [],
        horizon = 5;

    predict = function (lastRequested, lastQuality, lastHTTPRequest, last_Bufferleveling) {//lastRequested==index
        var self = this,
            max_award,
            last_DownloadTime, last_ChunkSize, last_Throughput,predict_Throughput,
            log_i, current_W, end_time, current_Interval,
            current_bufferlevel, current_Y, current_bufferleveling, current_rebuffer,
            current_award, current_Q, current_P, update_P, current_bandwidthpredict,
            predict_throughput, log_quality,pre1_avg,pre2_avg,
            bandwidthEst = 0,
            initial_Bandwidthpredict=0,
            Playing_time = 2,
            pre1_sum=0,
            pre2_sum=0,
            alpha = 0.9,
            //award parameter 
            log=[],
            past_Throughput_avg=[],
            past_Throughput_avg_clone=[],
            past_Bufferleveling_avg=[],
            past_Bufferleveling_avg_clone=[],
            contrast_throughput = [],
            contrast_award = [];

        if (lastHTTPRequest && lastRequested >= 0) {
            last_DownloadTime = (lastHTTPRequest._tfinish - lastHTTPRequest.tresponse) / 1000; //seconds
            //console.log("last_DownloadTime",last_DownloadTime);
            last_ChunkSize = get_chunk_size(lastQuality, lastRequested);//B
            last_Throughput = last_ChunkSize / last_DownloadTime / 1000000;//MB/S
            console.log("last_Throughput", last_Throughput);
            console.log("lastRequested ", lastRequested );
            //bugout.log("last_Throughput：" + last_Throughput);
            past_Throughput[lastRequested]=last_Throughput;
            past_DownloadTime.push(last_DownloadTime);
            //past_HTTPrequested_strat_time.push(last_HTTPRequest.tresponse);
            past_HTTPrequested_end_time.push(lastHTTPRequest._tfinish);
             past_Bufferleveling.push(last_Bufferleveling);
        }

        if (past_Throughput.length == 0) {
            return 0.1;
        }
        else {

            let onn = [];
           if (lastRequested < 6) {
                 let tmpIndex = Math.max(0, past_Throughput.length - horizon);
                 let tmpSum = 0;
                 let tmpDownloadTime = 0;
                  for (var i = tmpIndex; i < past_Throughput.length; i++) {
                       tmpSum = tmpSum + past_DownloadTime[i] / past_Throughput[i];
                        tmpDownloadTime = tmpDownloadTime + past_DownloadTime[i];
                  }
                  let initial_Bandwidthpredict = tmpDownloadTime/tmpSum;
            } else
                {
                 let tmpIndex = Math.max(0, past_Throughput.length - horizon);
                 let tmpSum = 0;
                 let tmpDownloadTime = 0;
                  for (var i = tmpIndex; i < past_Throughput.length; i++) {
                      tmpSum = tmpSum + past_DownloadTime[i] / past_Throughput[i];
                      tmpDownloadTime = tmpDownloadTime + past_DownloadTime[i];
                  }
                 pre1_avg= tmpDownloadTime/tmpSum;
                  //console.log("pre1_avg",pre1_avg);
                for (var i = tmpIndex; i < past_Throughput.length; i++) {
                    past_Throughput_avg[i] = past_Throughput[i] - pre1_avg;
                }
                for(var i=0;i<past_Throughput.length-tmpIndex;i++)
                {
                     past_Throughput_avg_clone[i]=past_Throughput_avg[tmpIndex+i];
                   //  console.log("past_Throughput_avg_clone[i]",past_Throughput_avg_clone[i]);
                    // console.log("past_Throughput_avg_clone[i]",past_Throughput_avg_clone[i]);
                }


                onn = ar_predict(past_Throughput_avg_clone, past_Throughput_avg_clone.length, 2, 2, 5);
                //onn = ar_predict(past_Throughput, past_Throughput.length, 2, 2, 100);
                //initial_Bandwidthpredict = pre1_avg + ar_predict(past_Throughput_avg, past_Throughput_avg.length, 2, 2, 100);
                 //   console.log("onn",onn[0]);
                 if(Math.abs(onn[0])>pre1_avg)
                        {
                                initial_Bandwidthpredict = pre1_avg;
                        }
                        else{
                                initial_Bandwidthpredict = pre1_avg + onn[0];}
              
                if (initial_Bandwidthpredict < 0) {
                    initial_Bandwidthpredict = pre1_avg;
                }
                if (initial_Bandwidthpredict > 5) {
                    initial_Bandwidthpredict = pre1_avg;
                }
                //current_W = onn[1];
                //bugout.log("lastRequested"+lastRequested);
                //bugout.log("last_Throughput"+last_Throughput);
                // bugout.log("predict:  " + initial_Bandwidthpredict + "lastRequested:  "+ lastRequested);
                  //    let current_index=last_index+1;
             //bugout.log("last_index：  " + lastRequested +"  last:   " +last_Throughput*8+"  current_index:  "+current_index+"  predict:  "+ initial_Bandwidthpredict*8+"  pre1_avg:  "+pre1_avg);


            }
            //current_index=lastRequested+1;
           //bugout.log("last_index：  " + lastRequested +"  last:   " +last_Throughput*8+"  current_index:  "+current_index+"  predict:  "+initial_Bandwidthpredict*8+"  pre_avg:  "+pre1_avg*8);
           // console.log("initial_Bandwidthpredict",initial_Bandwidthpredict);



            //predict2
            //last_Bufferleveling = DashMetrics.getCurrentBufferLevel("video", true);
            // past_Bufferleveling.push(last_Bufferleveling);
            //interval
            if (lastRequested > 0) {
                end_time = past_HTTPrequested_end_time[lastRequested - 1];
                current_Interval = (lastHTTPRequest.tresponse - end_time) / 1000;
            } else
                current_Interval = 0;
            //console.log("current_Interval",current_Interval);


            current_bufferlevel = last_Bufferleveling - current_Interval;
           // past_Bufferlevel[lastRequested]=current_bufferlevel;
           // console.log(" current_bufferlevel", current_bufferlevel);

            //buffer预测
            let off = [];
            if (lastRequested < 6) {
                if (past_Bufferlevel.length === 0) {
                current_bufferleveling=last_Bufferleveling;
            }
            else {
                let bufferIndex = Math.max(0, past_Bufferleveling.length - horizon);
                let bufferSum = 0;
                for (var i = bufferIndex; i < past_Bufferleveling.length; i++) {
                    bufferSum = bufferSum + past_Bufferleveling[i];
                }
                let predict_buffer = bufferSum / horizon;
                current_bufferleveling = predict_buffer;
            }

            }
            else {
                let bufferIndex = Math.max(0, past_Bufferleveling.length - horizon);
                 let bufferSum = 0;
                 let tmpDownloadTime = 0;
                  for (var i = bufferIndex; i < past_Bufferleveling.length; i++) {
                      bufferSum = bufferSum + past_Bufferleveling[i];
                  }
                let pre2_avg= bufferSum/horizon;
               // console.log("pre2_avg",pre2_avg);
                for (var i = bufferIndex; i < past_Bufferleveling.length; i++) {
                    past_Bufferleveling_avg[i] = past_Bufferleveling[i] - pre2_avg;
                }
                for(var i=0;i<past_Bufferleveling.length-bufferIndex;i++)
                {
                     past_Bufferleveling_avg_clone[i]=past_Bufferleveling_avg[bufferIndex+i];
                    // console.log("past_Throughput_avg_clone[i]",past_Throughput_avg_clone[i]);
                }


                off = ar_predict(past_Bufferleveling_avg_clone, past_Bufferleveling_avg_clone.length, 2, 2, 5);
                //onn = ar_predict(past_Throughput, past_Throughput.length, 2, 2, 100);
                //initial_Bandwidthpredict = pre1_avg + ar_predict(past_Throughput_avg, past_Throughput_avg.length, 2, 2, 100);
                current_bufferleveling = pre2_avg+off[0];
                //initial_Bandwidthpredict = pre1_avg+on[1];
                if (current_bufferleveling < 0) {
                    current_bufferleveling = pre2_avg;
                }
                if (current_bufferleveling > 20) {
                    current_bufferleveling = pre2_avg;
                }
                if ( Math.abs(current_bufferleveling - current_bufferlevel)>2) {
                    current_bufferleveling = current_bufferlevel;
                }
                //current_Q = off[1];
                //bugout.log("lastRequested"+lastRequested);
                //bugout.log("last_Throughput"+last_Throughput);
                //bugout.log("predict：" + initial_Bandwidthpredict);
                //bugout.downloadLog();

            }


            if(lastRequested>0) {
                current_Q = 0.95 * last_Q[lastRequested-1] + 0.05 * Math.pow(current_bufferlevel - past_Bufferlevel[lastRequested - 1], 2);
                current_Q = Math.pow(current_Q / [current_bufferlevel - (current_bufferleveling - Playing_time + current_Interval)],2);
            }
            else{
                current_Q=0.1;
            }
            last_Q[lastRequested]=current_Q;


            //console.log("current_bufferleveling", current_bufferleveling);
            //console.log(" current_Q ", current_Q );


            // buffer，bufferleveling——predict bandwidth2
            //if rebuffer=0
            let initial_bandwidth = [];
            let rebuffer;
            let qoe, QoE_max, log_rebuffer;
            let qoe_log = [];
            let quality_log = [];
            let difference, min_difference, final_difference;
            let difference_log = [];
            //if rebuffer！=0
            let initial_bandwidths = [];
            let log_pre2;
            let loglogi=[];
            let loglogdiff=[];
            if(lastRequested>1) {
                for (var i = 0; i < 6; i++) {
                    initial_bandwidth[i] = [VIDEO_BIT_RATE[i] / 1000] * Playing_time / [current_bufferlevel - (current_bufferleveling - Playing_time + current_Interval)];
                  //  console.log(" initial_bandwidth[i]", initial_bandwidth[i]);
                    for(let i=0;i< 6;i++){
			let loglog = get_best(initial_bandwidth[i], last_Bufferleveling, lastRequested, lastQuality);
                    if (loglog == i ) {

                            difference = Math.abs(initial_bandwidth[i] - pre1_avg);
                            loglogdiff.push(difference);
                            loglogi.push(i);

                    }

                }

                let min_diff = loglogdiff[0];
                let min_i = loglogi[0];
                if (loglogdiff.length > 1) {
                    for (let i = 1; i < loglogdiff.length; i++) {
                        //console.log("loglogdiff[i]",loglogdiff[i]);
                        if (min_diff > loglogdiff[i])
                            min_diff = loglogdiff[i];
                        min_i = loglogi[i];
                    }
                }
                predict_Throughput = initial_bandwidth[min_i];
                //console.log("predict_Throughput", predict_Throughput);

            }
            else{
                predict_Throughput=initial_Bandwidthpredict;
            }
		 let current_index=last_index+1;
              bugout.log("last_index：  " + lastRequested +"  last:   " +last_Throughput*8+"  current_index:  "+current_index+"  predict:  "+ predict_Throughput*8+"  lastbuffer  "+last_Bufferleveling+"  predictbuffer  "+current_bufferleveling+"  min_i:  "+min_i);

            /*

            for (let i = 0; i < 6; i++) {
                for (let j = 0; j < 6; j++) {
                    if ([VIDEO_BIT_RATE[j] / 1000] * Playing_time / initial_bandwidth[i] > current_bufferlevel)
                        rebuffer = [VIDEO_BIT_RATE[j] / 1000] * Playing_time / initial_bandwidth[i] - current_bufferlevel;
                    else
                        rebuffer = 0;

                    qoe = VIDEO_BIT_RATE[j] / 1000 - beta * Math.abs([VIDEO_BIT_RATE[j] / 1000 - VIDEO_BIT_RATE[last_quality] / 1000]) - deta * rebuffer;
                    console.log("qoe",qoe);
                    if (j == i)
                        QoE_max = qoe;
                    else
                        qoe_log.push(qoe);
                }
                log_rebuffer=0;
                for (let k = 0; k < qoe_log.length; k++) {
                    if (qoe_log[k] > QoE_max)
                        log_rebuffer = 1;
                }
                if (log_rebuffer == 0)
                    quality_log.push(i);
            }
            if (quality_log.length > 1) {
                for (let j = 0; j < quality_log.length; j++) {
                    difference = Math.abs(quality_log[j] - pre1_avg);
                    difference_log.push(difference);
                }
                min_difference = difference_log[0];
                final_difference = 0;
                for (let m = 1; m < difference_log.length; m++) {
                    if (difference_log[m] < min_difference) {
                        min_difference = difference_log[m];
                        final_difference = m;
                    }
                }
                predict_Throughput = initial_bandwidth[final_difference];
            //console.log("final_difference",final_difference);

            } else if (quality_log.length == 1) {
                predict_Throughput = initial_bandwidth[quality_log[0]];
            } else if (quality_log.length == 0) {
                //rebuffer不等于0；
                for (var i = 0; i < 6; i++) {
                    initial_bandwidths[i] = [VIDEO_BIT_RATE[i] / 1000] * Playing_time / current_bufferlevel;
                    //console.log("initial_bandwidth[i]",initial_bandwidth[i]);
                    if (pre1_avg < initial_bandwidths) {
                        log_pre2 = i;
                        break;
                    }
                }
                if (log_pre2 == 0) {
                    predict_Throughput = initial_bandwidth[log_pre2];
                } else {
                    predict_Throughput = initial_bandwidth[log_pre2 - 1];
                }
               // console.log("log_pre2",log_pre2);

            }
            //console.log("predict_Throughput",predict_Throughput);
           */
        //kalman


            if (lastRequested > 0) {
                current_W = 0.95 * last_W[lastRequested-1] + 0.05 * Math.pow(last_Throughput- past_Throughput[lastRequested-1],2);
                current_P = last_P[lastRequested - 1] + current_W;
            } else {
                current_P = 0.1;
                current_W = 0.1;
            }
            last_W[lastRequested]=current_W;
            //console.log("W",current_W);
            //console.log("Q",current_Q);

            let kalman_gain = current_W / (current_W + current_Q);
            //console.log("kalman_gain",kalman_gain);
            //console.log("kalman",kalman_gain);
            current_bandwidthpredict = initial_Bandwidthpredict + kalman_gain * (predict_Throughput - initial_Bandwidthpredict);
            //console.log("predictBandwidth",current_bandwidthpredict);
            //update lastP,w,y
            update_P = (1 - kalman_gain) * current_P;
            last_P.push(update_P);
            //console.log("p",update_P);

            return    predict_Throughput;
        }
    }

    function get_award(lastQuality, log_quality, predict_throughput, current_bufferlevel,current_rebuffer) {
        let Playing_time = 2;

        let smoothness = Math.abs(VIDEO_BIT_RATE[log_quality] / 1000 - VIDEO_BIT_RATE[lastQuality] / 1000);
        let current_award = VIDEO_BIT_RATE[log_quality] / 1000 - beta * smoothness - deta * current_rebuffer;
        return current_award;
    }

    function get_max_award(contrast_award,contrast_j)
    {
         let log_i;
         let max_award = contrast_award[0];
                    for (let i = 0; i < contrast_award.length; i++) {
                        if (max_award >= contrast_award[i]) {
                            max_award = contrast_award[i];
                             log_i = contrast_j[i];
                        }
                    }
         return log_i;
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

//矩阵转置
function transpose(matrix) {
    let result = new Array(matrix[0].length).fill(0).map(arr => new Array(matrix.length).fill(0));
    for (let i = 0; i < result.length; i++) {
        for (let j = 0; j < result[0].length; j++) {
            result[i][j] = matrix[j][i];
        }
    }
    return result;
}

//arma模型

function ar_predict(data, length,p,q,n) {
    var m_eta=[],     //白噪声
        m_phi=[],     //ar参数
        preNumble,
        m_theta=[];   //ma参数


    let phi = new Array(p).fill(0).map(arr => new Array(1).fill(0));

    phi=estimated_ar_parameter(data, length, p, q);//更新AR（p）系数
    for(var i=0; i<p ;i++){
      //console.log("123",phi[i][0]);
    }

    let parameter = new Array(p+q).fill(0).map(arr => new Array(1).fill(0));
    parameter=estimated_parameter(data, phi, length,length, p, q);
    for(var  i=0 ; i<p ; i++){
      m_phi[i]=parameter[i][0];
      //console.log("m_phi[i]",m_phi[i]);
    }
    for(var  i=0 ; i<q ; i++){
      m_theta[i]=parameter[i+p][0];

      // console.log(" m_theta[i]", m_theta[i]);
    }

    let m_sigma=0;
    for(let i=p+q+1;i<length;i++){
     m_sigma=m_sigma+get_var(data,parameter,length, i, p, q);
    }
     m_sigma=m_sigma/(length-p-q);


    m_eta=random(n,0,Math.sqrt(m_sigma));


    preNumble=m_eta[n-1];
	for(var i=0;i<p;i++){
		preNumble+=(m_phi[i]*data[length-p+i]);

	}

	for(var j=0;j<q;j++){
		preNumble+=(-m_theta[j]*m_eta[n-1-j]);

	}
	let on=[];
	on[0]= preNumble;
        on[1]=  m_sigma;

  return on;
}

    //ACF计算
function getACF(x,length,k){
    let denominator=0, numerator=0,
        temp,
        avr=0;

    for(var i=0 ; i<length ; i++){
        avr+=x[i];
    }
    avr/=length;
    for(var i=0 ; i<length-k ; i++){
      numerator+=((x[i]-avr)*(x[i+k]-avr));
    }
    numerator=numerator/(length-k);
    return numerator;
  }

//矩估计AP（p）参数，保存在phi[p][0]中
function estimated_ar_parameter(x, length, p, q){

    let transferMatrix = new Array(p).fill(0).map(arr => new Array(p).fill(0));
    let transferMatrixT = new Array(p).fill(0).map(arr => new Array(p).fill(0));
    let transferTT =[];
    let transferT =new Array(p).fill(0).map(arr => new Array(1).fill(0));;
    let phi = new Array(p).fill(0).map(arr => new Array(1).fill(0));
    for(var i=0;i<p;i++){
      for(var j=i;j<p;j++){
        transferMatrix[i][j]=getACF(x, length,j-i);
        }
      }
    //i-j
    for(var i=0;i<p;i++){
      for(var j=0;j<i;j++){
        transferMatrix[i][j]=getACF(x, length,i-j);
        }
      }
    transferMatrixT=inv(transferMatrix);//求transferMatrix的逆矩阵，保存在transferMatrixT中

     for(var i=0;i<p;i++){
     	transferTT[i]=getACF(x, length, i+1);
     }
     for(var i=0;i<p;i++)
     {
         transferT[i][0]=transferTT[i];
     }

     phi =multiply(transferMatrixT,transferT);
     return phi;
    }

    function  estimated_residual(data, phi, t, p){
    	let temp=data[t];
    	if(t>p+1){
    		for(var i=0;i<p;i++){
    			temp+=(-phi[i][0]*data[t-1-i]);
    		}
    	}
    	return temp;
    }

    function estimated_parameter(data, phi, length, t, p, q){
    	let transferMatrix = new Array(p+q).fill(0).map(arr => new Array(p+q).fill(0));
        let transferMatrix_verse=new Array(p+q).fill(0).map(arr => new Array(p+q).fill(0));//转置
        let transfer= new Array(p+q).fill(0).map(arr => new Array(1).fill(0)); //[p+q][1]
        let parameter=new Array(p+q).fill(0).map(arr => new Array(1).fill(0));  //[p+q]
        let m_x=new Array(length-p-q).fill(0).map(arr => new Array(1).fill(0));
        let m_E=new Array(length-p-q).fill(0).map(arr => new Array(q).fill(0));
        let m_XX=new Array(length-p-q).fill(0).map(arr => new Array(p).fill(0));
    	for(var i=0;i<length-p-q;i++){
    		   m_x[i][0]=data[i+p+q];        //  length-p-q
              //console.log( " m_x[i][0]", m_x[i][0]);
    	}

    	for(var i=0;i<length-p-q;i++){
    		for(var j=0;j<q;j++){
    			m_E[i][j]=estimated_residual(data, phi, p+q+i-j,p);   //[length-p-q,q]
               //console.log( " m_E[i][j]", m_E[i][j]);
    		}
    	}

    	for(var i=0;i<length-p-q;i++){
    		for(var j=0;j<p;j++){
    			m_XX[i][j]=data[p+q+i-j-1];          //[length-p-q,p]
            // console.log( " m_XX[i][j]", m_XX[i][j]);
    		}
    	}
        let temp1=new Array(p).fill(0).map(arr => new Array(p).fill(0));
    	let temp2=new Array(p).fill(0).map(arr => new Array(q).fill(0));
    	let temp3=new Array(q).fill(0).map(arr => new Array(p).fill(0));
    	let temp4=new Array(q).fill(0).map(arr => new Array(q).fill(0));
    	let te=new Array(p).fill(0).map(arr => new Array(length-p-q).fill(0));
    	te=transpose(m_XX);
    	 //for(var i=0;i<te.length;i++){
    	//	for(var j=0;j<te[0].length;j++){
    			//console.log("transpose(m_XX)",te[i][j]);}}
    	temp1=multiply(transpose(m_XX),m_XX);     //[p,p]

    	temp2=multiply(transpose(m_XX),m_E);        //[p,q]
    	temp3=multiply(transpose(m_E),m_XX);     //[q,p]
    	temp4=multiply(transpose(m_E),m_E);     //[q,q]


    	for(var i=0;i<p;i++){
           for(var j=0;j<p;j++){
              transferMatrix[i][j]=temp1[i][j];     //[p+q,p+q]
        }
      }

       for(var i=0;i<p;i++){
           for(var  j=p;j<p+q;j++){
              transferMatrix[i][j]=temp2[i][j-p];
        }
      }

      for(var i=p;i<p+q;i++){
          for(var j=0;j<p;j++){
              transferMatrix[i][j]=temp3[i-p][j];
        }
      }

      for(var i=p;i<p+q;i++){
        for(var j=p;j<p+q;j++){
              transferMatrix[i][j]=temp4[i-p][j-p];


        }
      }

      transferMatrix_verse=inv(transferMatrix);

      let temp5=new Array(p).fill(0).map(arr => new Array(1).fill(0));
      let temp6=new Array(q).fill(0).map(arr => new Array(1).fill(0));

      temp5=multiply(transpose(m_XX),m_x);  // m_XX-ni[p,length-q-p]  m_x[l-q-p,1]   =[p,1]
      temp6=multiply(transpose(m_E),m_x);   // m_E-ni[q,length-q-p]                  =[q,1]



      for(var i=0;i<p;i++){
        transfer[i][0]=temp5[i][0];

      }

      for(var  i=p;i<p+q;i++){
        transfer[i][0]=temp6[i-p][0];
      }

      parameter=multiply(transferMatrix_verse,transfer);//[p+q,p+q] [p+q,1]==[p+q,1]


      return parameter;
    }

     //最小二乘估计方差
    function get_var(newx,parameter,length, t, p, q){
      let temp=newx[t];
      let phi=new Array(p).fill(0).map(arr => new Array(1).fill(0));
      for(var i=0;i<p;i++){
        phi[i][0]=parameter[i][0];
        temp+=(-parameter[i][0]*newx[t-1-i]);
      }
      for(var  i=0;i<q;i++){
        temp+=(-parameter[i+p][0]*estimated_residual(newx, phi, t-1-i, p));
      }
      return temp*temp;
    }

    //计算白噪声方差
    function estimated_var(x, length, phi, p){
      let vary;
      let a;
      vary=getACF(x,length,0);

      for(var i=0;i<p;i++){
          a=getACF(x,length,i+1)*phi[i][0];
           vary=vary-a;
    	}
      return vary;
    }

	function random(n, mu, sigma) {
	  let seed = 0;
	  let U2;
	  let U1;
	  let Z0;
	  let m_eta=[];
	  for( var i=0;i<n;i++){
	      U1 = Math.random();
	      U2 = Math.random();

	 //  using Box-Muller transform to obtain a varaible with a standard normal distribution
	  Z0 = Math.sqrt(-2.0 * Math.log(U1)) * Math.cos( 2.0* 3.14 * U2);
	  m_eta[i] = sigma * Z0 + mu;
	  }
	  return m_eta;
	}

    function get_best(future_bandwidth,start_buffer,last_index,last_quality)
    {
         let best_combo=[];
         let max_reward = -1000000;
         let send_data;
         for(let i=0; i<full_combo.length; i++){
                let curr_rebuffer_time = 0;
                let curr_buffer = start_buffer;
                let quality=last_quality;
                let bitrate_sum = 0;
                let smoothness_diffs = 0
                let combo = full_combo[i].slice(0,5);
                for(let j=0; j<combo.length; j++){
                    let chunk_quality = combo[j];
                    let index = last_index + j + 1;
                    let s=get_chunk_size(chunk_quality, index);
                    let ss=s/1000000;
                    download_time = ss/future_bandwidth; // this is MB/MB/s --> seconds
                    if(curr_buffer<download_time){
                        curr_rebuffer_time += (download_time - curr_buffer);
                        if(index==0){
                             start_delay=curr_rebuffer_time;
                        }
                        curr_buffer = 0;
                    }
                    else{
                        curr_buffer -=download_time;
                    }
                    curr_buffer+=chunkLength;
                    bitrate_sum+=VIDEO_BIT_RATE[chunk_quality];
                    smoothness_diffs += Math.abs(VIDEO_BIT_RATE[chunk_quality] - VIDEO_BIT_RATE[quality]);
                    quality=chunk_quality;
                }
                let  reward=(bitrate_sum/1000)-(REBUF_PENALTY*curr_rebuffer_time)-(smoothness_diffs/1000);
                //console.log("reward",reward);

                if(reward>=max_reward){
                    if(best_combo.length>0 && best_combo[0]<combo[0]){
                      let  best_combo=combo;
                    }
                    else best_combo=combo;
                    max_reward=reward;
                     send_data=0;
                    if(best_combo.length>0){
                        send_data=best_combo[0];
                    }
                    let log_reward=reward;
                }

            }
         return send_data;
    }

    var QoE_sum=0;

    function getMaxIndex(rulesContext){
        const mediaType = rulesContext.getMediaInfo().type;
        var dashMetrics = DashMetrics(context).getInstance();
        const switchRequest = SwitchRequest(context).create();
        //switchRequest.quality = 3;
        //return switchRequest;
        var future_bandwidth,
            deta=3,
            beta=1;
        
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

            future_bandwidth = predict(last_index, last_quality, last_HTTPRequest,start_buffer);//MB/S
            //getPredictionError(last_index);
            let log_reward;
            
            future_chunk_length = MPC_FUTURE_CHUNK_COUNT;
            if ( TOTAL_VIDEO_CHUNKS - last_index < 5 ){
                future_chunk_length = TOTAL_VIDEO_CHUNKS - last_index;
            }

            let start_delay;
            let best_combo=[];

            max_reward = -1000000;

            //####获取当前缓冲区大小

            let quality,curr_buffer,chunk_quality,index,send_data;
            let combo=[];
            let download_time;
            let reward;
            
            //####计算每个码率组合的QOE，然后选择QoE值最大的组合
            for(let i=0; i<full_combo.length; i++){
                curr_rebuffer_time = 0;
                curr_buffer = start_buffer;
                bitrate_sum = 0;
                quality=last_quality;
                smoothness_diffs = 0;
                combo = full_combo[i].slice(0,future_chunk_length);
                for(let j=0; j<combo.length; j++){
                    chunk_quality = combo[j];
                    index = last_index + j + 1;
                    let s=get_chunk_size(chunk_quality, index);
                    let ss=s/1000000;
                    download_time = ss/future_bandwidth; // this is MB/MB/s --> seconds
                    if(curr_buffer<download_time){
                        curr_rebuffer_time += (download_time - curr_buffer);
                        if(index==0){
                             start_delay=curr_rebuffer_time;
                        }                    
                        curr_buffer = 0;
                    }
                    else{
                        curr_buffer -=download_time;
                    }
                    curr_buffer+=chunkLength;
                    bitrate_sum+=VIDEO_BIT_RATE[chunk_quality];
                    smoothness_diffs += Math.abs(VIDEO_BIT_RATE[chunk_quality] - VIDEO_BIT_RATE[quality]);
                    quality=chunk_quality;
                }
                reward=(bitrate_sum/1000)-(REBUF_PENALTY*curr_rebuffer_time)-(smoothness_diffs/1000);
                
                if(reward>=max_reward){
                    if(best_combo.length>0 && best_combo[0]<combo[0]){
                        best_combo=combo;
                    } 
                    else best_combo=combo;
                    max_reward=reward;
                    send_data=0;
                    if(best_combo.length>0){
                        send_data=best_combo[0];
                    }
                    log_reward=reward;
                }

            }

            //calculate the QoE of the last chunk
            var lastChunkRebuffering = dashMetrics.calculateRebufferTime();
            //console.log("lastChunkRebuffering",lastChunkRebuffering);
            /*if( last_index > 1 ) {
                if (lastChunkRebuffering > 0)
                    if(send_data>0)
                       send_data = send_data - 1;
             }*/

            console.log("lastRebuffering",lastChunkRebuffering/1000 )
            rebufferingArray.push(lastChunkRebuffering);
            last_index += 1;
            console.log("index",last_index);
            switchRequest.quality = send_data;
            switchRequest.priority = 1
            console.log("select quality:"+send_data)
            last_quality=send_data;
            qualityList.push(send_data);


             if(last_index>0)
               QoE_sum += VIDEO_BIT_RATE[last_quality]/1000-beta*Math.abs(VIDEO_BIT_RATE[last_quality]/1000-VIDEO_BIT_RATE[qualityList[last_index-1]]/1000)-deta*lastChunkRebuffering/1000;
             console.log("QoE",QoE_sum);


             //bugout.log("last_index：" + last_index);
              //bugout.log(" future_bandwidth"+ future_bandwidth);
             //bugout.log("send_data：" + send_data);
             //bugout.log("lastChunkRebuffering：" +lastChunkRebuffering/100);
             // bugout.log("QoE：" + QoE_sum);
              bugout.downloadLog();

        }
        else{//####音频的，只有一个码率，直接选择
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
