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

	d3.select('#navSVG')
	.attr('width', svgWidth*navScale)
	.attr('height', svgHeight*navScale)

	navX = d3.scale.linear()
	.domain([0,svgWidth])
	.range([0,svgWidth*navScale]);

	navY = d3.scale.linear()
	.domain([0,svgHeight])
	.range([0,svgHeight*navScale]);

	zoom.event(svg)
}
function zoomEventHandler(){

    tickEventHandler();
	updateViewPortRect();
	updateZoomText();
}

function startPanView(){
	isPanning = true
	lastTranslation = zoom.translate();
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

function updateViewPortRect () 
{
	var svgRect = d3.select('#svgRect'),viewRect = d3.select('#viewRect')
	var curScale = zoom.scale(),curTrans = zoom.translate();
	var rx,ry,rh,rw;
	var staticRect, dynamicRect;
	if(curScale > 1)
	{
		staticRect = svgRect;
		dynamicRect = viewRect;

		rx = - navX(curTrans[0]/curScale)
		ry = - navY(curTrans[1]/curScale)
		rw = navX(svgWidth/curScale)
		rh = navY(svgHeight/curScale)	
	}
	else
	{
		staticRect = viewRect;
		dynamicRect = svgRect;

		rx = navX(curTrans[0])
		ry = navY(curTrans[1])
		rw = navX(svgWidth*curScale)
		rh = navY(svgHeight*curScale)		
	}

	if(staticRect == null || dynamicRect == null)
		return;

	staticRect
		.attr('width', navX(svgWidth))
		.attr('height', navY(svgHeight))
		.attr('x', 0)
		.attr('y', 0)		
	dynamicRect
	    .attr('x', rx)
	    .attr('y', ry)
	    .attr('width', rw)
	    .attr('height', rh)	    
	  
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

	// console.log(res)
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

function resetZoom(){
	zoomTo([svgWidth/2,svgHeight/2,svgWidth])
}