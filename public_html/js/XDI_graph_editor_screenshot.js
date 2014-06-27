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
function exportToPNG () {
  var oldSVG = d3.select('#mainCanvas');
  var newSVG = d3.select(oldSVG.node().cloneNode(true));
  
  //Setup new SVG and Remove unecessary elements
  newSVG.select('.drag_line').remove();
  newSVG.select('#dragSelectCanvas').remove();
  newSVG.select('#status').remove();

  var minX = x(d3.min(lastDrawData.nodes,function(d) { return d.x; }))-50;
  var minY = y(d3.min(lastDrawData.nodes,function(d) { return d.y; }))-50;
  var maxX = x(d3.max(lastDrawData.nodes,function(d) { return d.x; }))+50;
  var maxY = y(d3.max(lastDrawData.nodes,function(d) { return d.y; }))+50;
  var dx = maxX -  minX, dy = maxY - minY;
  newSVG
    .attr('height', dy)
    .attr('width', dx)
    .selectAll('#linkCanvas,#nodeCanvas')
    .attr('transform', 'translate(' + (-minX) + ',' + (-minY) + ')');

  


  copyNodeStyle('.node',oldSVG,newSVG);
  copyNodeStyle('.node.root',oldSVG,newSVG);
  copyNodeStyle('.node.literal',oldSVG,newSVG);
  copyNodeStyle('.node.entity',oldSVG,newSVG);
  copyNodeStyle('.node.attribute',oldSVG,newSVG);
  copyNodeStyle('.node.value',oldSVG,newSVG);
  
  copyLinkStyle('.link',oldSVG,newSVG);
  copyLinkStyle('.link.relation',oldSVG,newSVG);
  copyLinkStyle('.link.literal',oldSVG,newSVG);
  copyLinkStyle('.link.left',oldSVG,newSVG);
  copyLinkStyle('.link.right',oldSVG,newSVG);
  copyLinkStyle('.link.right.relation',oldSVG,newSVG);
  copyLinkStyle('.link.right.literal',oldSVG,newSVG);
  
  copyTextStyle('.node text',oldSVG,newSVG);
  copyTextStyle('.link text',oldSVG,newSVG);
  copyTextStyle('.link.relation text',oldSVG,newSVG);


  screenshot(newSVG);
}

function copyNodeStyle (selector,oldSVG,newSVG) {
  copyElementStyle(selector,oldSVG,newSVG,['fill','stroke','stroke-width']);
}

function copyLinkStyle (selector,oldSVG,newSVG) {
  copyElementStyle(selector,oldSVG,newSVG,['fill','stroke','stroke-width','stroke-dasharray','marker-start','marker-end']);
}

function copyTextStyle (selector,oldSVG,newSVG) {
  copyElementStyle(selector,oldSVG,newSVG,['font-size','font-family','fill','stroke-width','opacity']);
}

function copyElementStyle (selector,oldSVG,newSVG,styleNames) {
  var sample = svg.select(selector);
  if(!sample.node())
    return;
  var styles = {};
  
  styleNames.forEach(function(d) { 
    var value = sample.style(d);
    value = value.replace('url(','url(#');
    styles[d] = value;
  })
  
  newSVG.selectAll(selector)
    .style(styles);
}


function screenshot(svgToShot){
  svgToShot
    .attr("version", 1.1)
    .attr("xmlns", "http://www.w3.org/2000/svg")
  
  var serializer = new XMLSerializer();
  var html = serializer.serializeToString(svgToShot.node());
    
  var imgsrc = 'data:image/svg+xml;base64,'+ btoa(html);
  // window.open(imgsrc,'_blank');
  var image = new Image();
  image.src = imgsrc;

  image.onload = function () {
    var canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    var context = canvas.getContext('2d');
    context.drawImage(image,0,0);

    var pngsrc = canvas.toDataURL();
    window.open(pngsrc,'_blank');
  }
  image.crossOrigin = 'anonymous';
  
}