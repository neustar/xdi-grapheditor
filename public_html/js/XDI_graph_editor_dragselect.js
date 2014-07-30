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

function initializeDragSelect () {
    dragSelectBrush = d3.svg.brush()
        .x(x)
        .y(y)
        .on('brushstart',brushstart)
        .on('brush',brushmove)
        .on('brushend',brushend);

    d3.select('#dragSelectCanvas')
        .attr('class', 'brush')
        .call(dragSelectBrush);

    d3.select('#dragSelectCanvas .background')
        .style('cursor', 'inherit');
}


function brushstart (d) {
    dragSelectBrush.clear();
}


function brushend (d) {
    if(!dragSelectBrush)
        return;
    
    var selectedNodes = d3.selectAll('.node.selected').data();
    var selectedLinks = d3.selectAll('.link.selected').data();
    
    setSelectedNodes(selectedNodes);
    setSelectedLinks(selectedLinks);

    updateSelectionClass();

    dragSelectBrush.clear();
    d3.select('#dragSelectCanvas').call(dragSelectBrush);
}

function brushmove (d) {
    if(hasTouchZoomed)
    {
        hasTouchZoomed = false;
        dragSelectBrush.clear();
        d3.select('#dragSelectCanvas').call(dragSelectBrush);
        return;
    }


    var extent = dragSelectBrush.extent();
    d3.selectAll('.node')
        .classed('selected',function(d) {return d.isSelected = isInExtent(d,extent);});
    
    d3.selectAll('.link')
        .classed('selected',function(d) {return d.isSelected = isInExtent(d.source,extent)&&isInExtent(d.target,extent);});
}

function isInExtent (d,extent) {
    var Rx = x.invert(NODE_RADIUS) - x.invert(0);
    var Ry = y.invert(NODE_RADIUS) - y.invert(0);
    return extent[0][0] - Rx  <= d.x && d.x < extent[1][0] + Rx
        && extent[0][1] - Ry <= d.y && d.y < extent[1][1] + Ry; 

}


function setDragSelectAbility (canSelect) {
    d3.select(".brush")
        .style("pointer-events",canSelect? "all":"none");
}

