

var BBARule;
function BBARuleClass() {
   
    let factory = dashjs.FactoryMaker;
    let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
    let DashMetrics = factory.getSingletonFactoryByName('DashMetrics');
    let MetricsModel = factory.getSingletonFactoryByName('MetricsModel');
    let StreamController = factory.getSingletonFactoryByName('StreamController');
    let context = this.context;
    let instance;
    
    const reservoirBufferLength = 8; 
    const cushionBufferLength = 20;
    //var currentBufferLength;
    var lastChunkBitrate = 0;
    
    function setup() {
       
    }
    
    function f( currentBufferLength, step, rateMap ){//cal bufferlength to bitrate      
        if( currentBufferLength <= cushionBufferLength + reservoirBufferLength && currentBufferLength >= reservoirBufferLength ){
            //console.log("rateMap: " + rateMap[Math.round( (currentBufferLength - reservoirBufferLength) / step ) * step + reservoirBufferLength]);
            console.log(Math.round( (currentBufferLength - reservoirBufferLength) / step ) * step + reservoirBufferLength);
            return rateMap[Math.round( (currentBufferLength - reservoirBufferLength) / step ) * step + reservoirBufferLength];
        }
        else if(currentBufferLength > cushionBufferLength + reservoirBufferLength){
            //console.log("rateMap: " + rateMap[cushionBufferLength + reservoirBufferLength]);
            return rateMap[cushionBufferLength + reservoirBufferLength];
        }
        else{
            //console.log("rateMap: " + rateMap[reservoirBufferLength]);
            return rateMap[reservoirBufferLength];
        }
    }
    
    function getMaxIndex(rulesContext){
        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaType();
        const abrController = rulesContext.getAbrController();
        const streamInfo = rulesContext.getStreamInfo();
        var metricsModel=MetricsModel(context).getInstance();
        var dashMetrics = DashMetrics(context).getInstance();
        let switchRequest = SwitchRequest(context).create();
        
        if (mediaType === 'video'){ //set audio quality
            let bitrateList = abrController.getBitrateList(mediaInfo);//getBitrateList  video
            let rateMax = bitrateList[bitrateList.length-1].bitrate;
            let rateMin = bitrateList[0].bitrate;
            let bitrateUp, bitrateUpId, bitrateDown, bitrateDownId, nextBitrate, frate;
            let currentBufferLength = dashMetrics.getCurrentBufferLevel(mediaType, true);
            //console.log("video currentBufferLength: " + currentBufferLength);
            let rateMap = {};
            let step = cushionBufferLength / (bitrateList.length-1);
            for(let i = 0; i < bitrateList.length; i++){
                rateMap[reservoirBufferLength + i * step] = bitrateList[i].bitrate;
            }
            frate = f( currentBufferLength, step, rateMap );
            console.log("map"+JSON.stringify(rateMap))
            
            if ( lastChunkBitrate == rateMax ){
                bitrateUp = rateMax;
            }
            else {
                for(let i = 0; i < bitrateList.length; i++)
                    if(bitrateList[i].bitrate > lastChunkBitrate)
                    {
                        bitrateUp = bitrateList[i].bitrate;
                        break;
                    }
            }
            if ( lastChunkBitrate == rateMin ){
                bitrateDown = rateMin;
            }
            else {
                for(let i = bitrateList.length-1; i >= 0; i--)
                    if(bitrateList[i].bitrate < lastChunkBitrate)
                    {
                        bitrateDown = bitrateList[i].bitrate;
                        break;
                    }
            }
            
            if ( currentBufferLength <= reservoirBufferLength ){
                nextBitrate = rateMin;
            }
            else if ( currentBufferLength >= reservoirBufferLength + cushionBufferLength ){
                nextBitrate = rateMax;
            }
            else if ( frate >= bitrateUp ){
                for( let i = bitrateList.length-1; i >= 0; i-- ) {
                    if( bitrateList[i].bitrate  <= frate ) {
                        nextBitrate = bitrateList[i].bitrate;                        
                        break;
                    }
                }
            }
            else if ( frate <= bitrateDown ){
                for( let i = 0; i < bitrateList.length; i++ ) {
                    if( bitrateList[i].bitrate > frate ) {
                        nextBitrate = bitrateList[i].bitrate;                        
                        break;
                    }
                }
            }
            else { nextBitrate = lastChunkBitrate; }
            
            lastChunkBitrate = nextBitrate;
            switchRequest.quality = abrController.getQualityForBitrate(mediaInfo, nextBitrate/1000, 0);
            console.log("quality:"+switchRequest.quality);
        }
        else { 
            //let currentBufferLength = dashMetrics.getCurrentBufferLevel(mediaType, true);
            //console.log("audio currentBufferLength: " + currentBufferLength);            
            switchRequest.quality = 0; }//set audio quality
        
        console.log("use BBA\n ");
        return switchRequest;
    }
    
    
    function reset() {}
    
    instance = {
        getMaxIndex: getMaxIndex,
        reset: reset
    };

    setup();
    return instance;
}

BBARuleClass.__dashjs_factory_name = 'BBARule';
BBARule = dashjs.FactoryMaker.getClassFactory(BBARuleClass);
