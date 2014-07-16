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

/*Function copyed from d3.js in order to make conditional drag*/

nodeForceDrag = function() {
  if (!drag) drag = d3.behavior.drag().origin(function(d){return d;}).on("dragstart.force", d3_layout_forceDragstart).on("drag.force", force_dragmove).on("dragend.force", d3_layout_forceDragend);
  if (!arguments.length) return drag;
  this.on("mouseover.force", d3_layout_forceMouseover).on("mouseout.force", d3_layout_forceMouseout).call(drag);
};
function force_dragmove() {    
	if(!canDrag())
		return;

  selected_nodes.forEach(function(d) { 
    d.px += d3.event.dx/getScaleRatio(),d.py += d3.event.dy/getScaleRatio();
   });
  
  currentLayout.force.resume();
}
    
function d3_layout_forceDragstart() {
  stopTouchPropagation();
  selected_nodes.forEach(function(d) { 
  d.fixed |= 2; //temporily make a node fix, but don't overide the orinal value of d.fixed
  });
}
function d3_layout_forceDragend() {
  selected_nodes.forEach(function(d) { 
    d.fixed &= ~6;      // make a node move again
  });
}
function d3_layout_forceMouseover(d) {
    d.fixed |= 4;      //temporily make a node fix
    d.px = d.x, d.py = d.y;
}
function d3_layout_forceMouseout(d) {
    d.fixed &= ~4;     //temporily make a node move again
}

function canDrag(){
  var mouseevent = null;
  if(d3.event instanceof MouseEvent)
    mouseevent = d3.event;
  else
    mouseevent = d3.event.sourceEvent;
  return !mouseevent.shiftKey&&!mouseevent.altKey;

}

function stopTouchPropagation () {
  var sourceEvent = d3.event.sourceEvent;
  if(sourceEvent instanceof TouchEvent)
  {
    sourceEvent.stopPropagation();
    sourceEvent.preventDefault();
  }
}
