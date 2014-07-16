/* 
The MIT License (MIT)

Copyright (c) 2014 Neustar Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
function initializeZoom () {    
    zoom = d3.behavior.zoom()
        .x(x)
        .y(y)
        .scaleExtent([0,Infinity])
        .on("zoomstart", zoomStartEventHandler)
        .on("zoom",zoomEventHandler)
        .on("zoomend", zoomEndEventHandler)

    zoom(svg);


    svg.on("mousedown.zoom", null);
    svg.on("mousemove.zoom", null);
    svg.on("dblclick.zoom", null);
    svg.on("wheel.zoom", null);
    svg.on("mousewheel.zoom", null);
    svg.on("MozMousePixelScroll.zoom", null);


    navDrag = d3.behavior.drag()
        .on('drag',navDragged)

    d3.select('#navSVG')
        .on('mousewheel',mousewheelOnSVG)
        .call(navDrag);

    updateNavSize();

    zoom.event(svg);
}

function updateNavSize () {
    d3.select('#navSVG')
        .attr('width', svgWidth*navScale + navMargin * 2)
        .attr('height', svgHeight*navScale + navMargin * 2)
    .selectAll('g')
        .attr('transform', 'translate(' + navMargin + ',' + navMargin + ')');
}

var lastTranslate = [0,0], hasTouchZoomed = false;

function zoomStartEventHandler () {

}


function zoomEndEventHandler () {
    lastTranslate = zoom.translate();
}

function zoomEventHandler(){
    var sourceEvent = d3.event.sourceEvent;
    if(sourceEvent instanceof TouchEvent)
    {       
        if(sourceEvent.touches.length < 2)
        {
            zoom.translate(lastTranslate);
            return;
        }
        else
        {
            sourceEvent.stopPropagation();
            sourceEvent.preventDefault();
            hasTouchZoomed = true;
        }
    }   
    
    lastTranslate = zoom.translate();
    
    currentLayout.updateElementPos();
    updateViewPortRect();
    updateZoomText();

    if(!(sourceEvent instanceof WheelEvent))
        return;
    
    if(d3.event.sourceEvent.wheelDelta > 0)
        updateMode(Mode.ZOOM_IN);
    else
        updateMode(Mode.ZOOM_OUT);
}

function startPanView(){
    isPanning = true
    lastTranslation = zoom.translate();
    updateMode(Mode.PAN);
}

function updatePanView(curMousePos){
    if(!isPanning || lastMousePos === null||lastTranslation === null)
        return;
    
    tx = lastTranslation[0] + curMousePos[0] - lastMousePos[0];
    ty = lastTranslation[1] + curMousePos[1] - lastMousePos[1];
    setScaleTranslation(null,[tx,ty]);
}

function setScaleTranslation(newScale,newTranslation){
    if(newScale != null)
        zoom.scale(newScale);
    if(newTranslation != null)
        zoom.translate(newTranslation);
    zoom.event(svg);
}

function endPanView(){
    isPanning = false;
    lastTranslation = null;
    updateMode(Mode.VIEW);
}

function scaleView(center,newScale)
{
    var scaleExtent = zoom.scaleExtent();
    var maxScale = d3.max(scaleExtent);
    var minScale = d3.min(scaleExtent);
    newScale = Math.max(newScale,minScale);
    newScale = Math.min(newScale,maxScale);


    var s0 = zoom.scale();
    var s1 = newScale;
    

    var mx = center[0];
    var my = center[1];
    
    var currrentTranslation = zoom.translate();
    var tx0 = currrentTranslation[0];
    var ty0 = currrentTranslation[1];

    var tx1 = mx - (mx-tx0)/s0*s1;
    var ty1 = my - (my-ty0)/s0*s1;
    
    setScaleTranslation(s1,[tx1,ty1]);
}

function updateViewPortRect() 
{
    if(!lastDrawData || _.isEmpty(lastDrawData.nodes))
        return;

    var svgRect = d3.select('#svgRect'),viewRect = d3.select('#viewRect');
    var navHeight = svgHeight * navScale;
    var navWidth = svgWidth * navScale;

    var nodesData = lastDrawData.nodes;

    var minX = x(d3.min(nodesData,function(d) { return d.x; }));
    var minY = y(d3.min(nodesData,function(d) { return d.y; }));
    var maxX = x(d3.max(nodesData,function(d) { return d.x; }));
    var maxY = y(d3.max(nodesData,function(d) { return d.y; }));
    var dx = maxX -  minX, dy = maxY - minY;
    
    var vx,vy,vw,vh,sx,sy,sw,sh,r,ox,oy;
    
    if(dx > svgWidth || dy > svgHeight)
    {
        r = Math.min(navHeight/dy,navWidth/dx);
        sx = 0;
        sy = 0;
        vx = (-minX) * r;
        vy = (-minY) * r;
        ox = (navWidth - dx * r) / 2;
        oy = (navHeight - dy * r) / 2;

        isViewRectStatic = false;
    }
    else
    {
        r = Math.min(navHeight / svgHeight,navWidth / svgWidth);
        vx = 0;
        vy = 0;     
        sx = minX * r;
        sy = minY * r;
        ox = 0;
        oy = 0;

        isViewRectStatic = true;
    }

    vw = svgWidth * r;
    vh = svgHeight * r;
    sw = dx * r;
    sh = dy * r;

    svgRect.attr('x', sx+ox).attr('y', sy+oy).attr('width', sw).attr('height', sh);
    viewRect.attr('x', vx+ox).attr('y', vy+oy).attr('width', vw).attr('height', vh);
      

    updateNavSize();
}   


function updateZoomText () {
    curScale = zoom.scale();
    curScale = Math.round(curScale*100)/100;
    d3.select('#zoomText')
        .text(curScale+" x");
}
function getScaleRatio(){
    return zoom.scale();
}


function zoomFromTo (from,to) {
    var center = [svgWidth/2, svgHeight/2]
    var i = d3.interpolateZoom(from,to)
    d3.transition()
        .duration(Math.abs(i.duration)) //might a bug it will return negatative when the center remain the same 
        .tween("",function  () {
            return function (t) {
                // console.log(i(t))
                var res = i(t);
                var k = svgWidth / res[2];
                var newTranslation = [center[0] - res[0] * k,center[1] - res[1] * k];           
                // console.log(newTranslation + " " + k)
                zoom.translate(newTranslation);
                zoom.scale(k);
                zoom.event(svg);
            }
        });
}

function zoomTo (to) {
    var scale = zoom.scale();
    var translate = zoom.translate();
    var curWidth = svgWidth / scale;
    var curCenter = [0,0];

    curCenter[0] = (-translate[0] + svgWidth/2)/scale;
    curCenter[1] = (-translate[1] + svgHeight/2)/scale;

    var res = [curCenter[0],curCenter[1],curWidth];

    zoomFromTo(res,to);
}

function zoomToElement(d,scale){
    scale = scale || 2;
    if(d.x!=null && d.y!=null)
    {
        zoomTo([d.x,d.y,svgWidth/scale]);   
    }
    else if(d.source != null && d.target != null)
    {
        var zx = (d.source.x + d.target.x)/2;
        var zy = (d.source.y + d.target.y)/2;
        zoomTo([zx,zy,svgWidth/scale]); 
    }
}

function zoomElementToPos (d,newPos,scale) {
    zoomTo([svgWidth/2 - newPos[0] + d.x, svgHeight/2 - newPos[1] + d.y, svgWidth/scale]);
}


function zoomToFit () {
    if(!_.isEmpty(selected_nodes))
        zoomToElementCollection(selected_nodes);
    else
        zoomToElementCollection(lastDrawData.nodes);
}

function zoomToSelection () {
    if(selected_nodes)
        zoomToElementCollection(selected_nodes);
}

function zoomToElementCollection (collection) {
    var minX = d3.min(collection,function(d) { return d.x; });
    var minY = d3.min(collection,function(d) { return d.y; });
    var maxX = d3.max(collection,function(d) { return d.x; });
    var maxY = d3.max(collection,function(d) { return d.y; });
    var dx = maxX -  minX, dy = maxY - minY;
    var r = Math.max(dx / svgWidth,dy / svgHeight);

    zoomTo([(minX+maxX)/2,(minY+maxY)/2,r*svgWidth+2*zoomToFitMargin]); //The margin doesn't equal to the margin between graph edge and svg edge, which depends on the final scale value.
}

function zoomToActualSize(){
    zoomTo([svgWidth/2,svgHeight/2,svgWidth]);
}

function zoomByScaleDelta (delta,centerPos,withTransition) {
    var currentScale = zoom.scale();
        currentScale += delta;
    
    var scaleExtent = zoom.scaleExtent();
    var maxScale = d3.max(scaleExtent);
    var minScale = d3.min(scaleExtent);
    if(currentScale > maxScale || currentScale <= minScale)
        return;

    if(withTransition)
        zoomTo([centerPos[0],centerPos[1],svgWidth/currentScale]);
    else
        scaleView(centerPos,currentScale);   
}

function resetZoom () {
    zoom.translate([0,0]);
    zoom.scale(1);
}


function navDragged () {
    var newTranslate = zoom.translate();

    if(isViewRectStatic) 
    {   
        //Pan to move the graph content
        newTranslate[0] += d3.event.dx/navScale;
        newTranslate[1] += d3.event.dy/navScale;
    }
    else
    {   
        //Pan to move the viewport
        newTranslate[0] -= d3.event.dx/navScale;
        newTranslate[1] -= d3.event.dy/navScale;
    }
    setScaleTranslation(null,newTranslate);
}