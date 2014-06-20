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
    .scaleExtent([0.01,10])
    .on("zoom",zoomEventHandler)

    zoom(svg);

    svg.on("mousedown.zoom", null);
	svg.on("mousemove.zoom", null);
	svg.on("dblclick.zoom", null);
	svg.on("wheel.zoom", null);
	svg.on("mousewheel.zoom", null);
	svg.on("MozMousePixelScroll.zoom", null);

	updateNavSize();

	zoom.event(svg)
}

function updateNavSize () {
	d3.select('#navSVG')
    	.attr('width', svgWidth*navScale + navMargin * 2)
    	.attr('height', svgHeight*navScale + navMargin * 2)
    .selectAll('g')
    	.attr('transform', 'translate(' + navMargin + ',' + navMargin + ')')
}

function zoomEventHandler(){
    forceTickEventHandler();
	updateViewPortRect();
	updateZoomText();

	if(d3.event == null || !(d3.event.sourceEvent instanceof WheelEvent))
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
	if(!isPanning || lastMousePos == null||lastTranslation == null)
		return;
	
	tx = lastTranslation[0] + curMousePos[0] - lastMousePos[0]
	ty = lastTranslation[1] + curMousePos[1] - lastMousePos[1]
	setScaleTranslation(null,[tx,ty]);
}

function setScaleTranslation(newScale,newTranslation){
	if(newScale != null)
		zoom.scale(newScale);
	if(newTranslation != null)
		zoom.translate(newTranslation)
	zoom.event(svg);
}

function endPanView(){
	isPanning = false;
	lastTranslation = null;
	updateMode(Mode.VIEW);
}

function scaleView(center,newScale)
{
	scaleExtent = zoom.scaleExtent()
	maxScale = d3.max(scaleExtent)
	minScale = d3.min(scaleExtent)
	newScale = Math.max(newScale,minScale)
	newScale = Math.min(newScale,maxScale)


	var s0 = zoom.scale();
	var s1 = newScale;
	

	var mx = center[0]
	var my = center[1]
	
	currrentTranslation = zoom.translate();
	var tx0 = currrentTranslation[0]
	var ty0 = currrentTranslation[1]

	var tx1 = mx - (mx-tx0)/s0*s1
	var ty1 = my - (my-ty0)/s0*s1
	
	setScaleTranslation(s1,[tx1,ty1]);
}

function updateViewPortRect() 
{
	if(!lastDrawData)
		return;

	var svgRect = d3.select('#svgRect'),viewRect = d3.select('#viewRect')
	var svgActualHeight = d3.select('#mainCanvas').node().offsetHeight;
	var svgActualWidth = d3.select('#mainCanvas').node().offsetWidth;
	var navActualHeight = svgHeight*navScale;

	var nodesData = lastDrawData.nodes;

	var minX = x(d3.min(nodesData,function(d) { return d.x; }));
	var minY = y(d3.min(nodesData,function(d) { return d.y; }));
	var maxX = x(d3.max(nodesData,function(d) { return d.x; }));
	var maxY = y(d3.max(nodesData,function(d) { return d.y; }));
	var dx = maxX -  minX, dy = maxY - minY;
	
	var vx,vy,vw,vh,sx,sy,sw,sh,r;
	
  	if(dx > svgActualWidth || dy > svgActualHeight)
  	{
  		r = navActualHeight/ dy;
  		sx = 0;
  		sy = 0;
  		vx = (-minX) * r;
  		vy = (-minY) * r;
  	
  	}
  	else
	{
  		r = navActualHeight / svgActualHeight;
  		vx = 0;
  		vy = 0;  	
  		sx = minX * r;
  		sy = minY * r;
  	}

	vw = svgActualWidth * r;
	vh = svgActualHeight * r;
	sw = dx * r;
	sh = dy * r;

  	svgRect.attr('x', sx).attr('y', sy).attr('width', sw).attr('height', sh);
  	viewRect.attr('x', vx).attr('y', vy).attr('width', vw).attr('height', vh);
	  
	updateNavSize();
}	

function updateZoomText () {
	curScale = zoom.scale()
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
	})
}

function zoomTo (to) {
	var scale = zoom.scale();
	var translate = zoom.translate();
	var curWidth = svgWidth / scale;
	var curCenter = [0,0];

	curCenter[0] = (-translate[0] + svgWidth/2)/scale;
	curCenter[1] = (-translate[1] + svgHeight/2)/scale;

	var res = [curCenter[0],curCenter[1],curWidth]

	zoomFromTo(res,to)
}

function zoomToElement(d){
	if(d.x!=null && d.y!=null)
	{
		zoomTo([d.x,d.y,svgWidth*0.5]);	
	}
	else if(d.source != null && d.target != null)
	{
		var zx = (d.source.x + d.target.x)/2;
		var zy = (d.source.y + d.target.y)/2;
		zoomTo([zx,zy,svgWidth*0.5]);	
	}
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

	zoomTo([(minX+maxX)/2,(minY+maxY)/2,r*svgWidth+2*zoomToFitMargin]) //The margin doesn't equal to the margin between graph edge and svg edge, which depends on the final scale value.
}

function resetZoom(){
	zoomTo([svgWidth/2,svgHeight/2,svgWidth])
}