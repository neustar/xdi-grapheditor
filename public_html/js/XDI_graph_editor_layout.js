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

//Layout base class
function GraphLayout(){
    this.name = "Layout";

}

GraphLayout.prototype.hasOverlapLink = function (d) {
    var valence1 = d.source.id + "-" + d.target.id;
    var valence2 = d.target.id + "-" + d.source.id;

    var tmpMap = lastDrawData ? lastDrawData.map : globalNodeLinkMap; //Use the lastest map that only has the visible links
    
    return (valence2 in tmpMap) && (valence1 in tmpMap);
}

GraphLayout.prototype.isLayoutRoot = function (nodeD) {
    return nodeD.isCommonRoot();
}

GraphLayout.prototype.alignTargetPoint = function (d) {
    var deltaX = d.target.x - d.source.x,
        deltaY = d.target.y - d.source.y,
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        normX = deltaX / dist,
        normY = deltaY / dist,
        sourcePadding = d.left ? LINK_ARROW_PADDING : LINK_END_PADDING,
        targetPadding = d.right ? LINK_ARROW_PADDING : LINK_END_PADDING;

    sourcePadding =  sourcePadding / zoom.scale();
    targetPadding = targetPadding / zoom.scale();

    var newPos = {};
    newPos.sourceX = d.source.x + (sourcePadding * normX);
    newPos.sourceY = d.source.y + (sourcePadding * normY);
    newPos.targetX = d.target.x - (targetPadding * normX);
    newPos.targetY = d.target.y - (targetPadding * normY);
    newPos.dist = dist;
    return newPos;
}

GraphLayout.prototype.initializeSettings = function () {
    var control = d3.select('#layout-control')
    
    control.selectAll('section').remove();
    
    var section = control.selectAll('section')
        .data(this.settingsName)
        .enter()
        .append('section')

    section.append('p').text(function(d) { return d.name; });

    section.append('input')
        .attr('type', 'range')
        .attr('id', function(d) { return d.id; })
        .attr('onchange', 'updateLayoutParameterCommand()')

    section.append('span').text(function(d) { return d.minName; });

    section.append('span').text(function(d) { return d.maxName; });

    this.resetLayoutParameter();

}

GraphLayout.prototype.updateLayoutParameter = function () {
    this.settingsName.forEach(function (d) {
        this.settings[d.id] = this.getSliderValue('#'+d.id);
    },this);
    
}

GraphLayout.prototype.resetLayoutParameter = function (){
    this.settings = {};
    this.settingsName.forEach(function (d) {
        this.settings[d.id] = 1;
        d3.select('#'+d.id).node().value = 50;
    },this);
}

GraphLayout.prototype.getSliderValue = function (id) {
    var v = d3.select(id).node().value;
    return 0.1 + v/100 * 1.8; //ranging from 0.1 ~ 1.9, equals 1 when v = 50
}

///
/// Force Layout
///



function ForceLayout (){
    this.name = "Force";
    
    this.force = d3.layout.force()
        .size([svgWidth, svgHeight])
        .on("tick", this.updateElementPos)
        .on('end',updateViewPortRect);

    this.settingsName = forceLayoutSettings;
    this.initializeSettings();

    d3.select('#forceLayoutCommand')
    .classed('checked',true);
}

ForceLayout.prototype = new GraphLayout();
ForceLayout.prototype.updateLayout = function(nodes,links,centerRootNodes) {
    if(_.isEmpty(nodes)&&_.isEmpty(links))
        return;
    var numberOfNodes = nodes.length;
    var numberOflinks = links.length;

    nodes.forEach(function (item) {
        item.fixed = isFrozen     //if overall is frozen
        ||item.isCommonRoot()             //if a node is root
        ||item._fixed             //or is intenionally set to fixed from other ways
        ||_.isEmpty(item.parents) //or has no parents (to provide a separate float away)

        //Move root to the middle of the screen. The random avoids overlaps.
        if(centerRootNodes&&item.isCommonRoot())
        {
            item.x = window.innerWidth/2 + Math.random()*100; item.y = window.innerHeight/2;
        }
        //clear previous force data, void rapid jumping, the values can be undefined.
        item.px = item.x;
        item.py = item.y;
     });                             


    this.force
        .gravity(0)
        .linkDistance(function(d) { 
                // default is 20.
                return (30 + 30*d.source.children.length) * currentLayout.settings.linkDistance;
            })
        .linkStrength(function(d) {
                // range is [0,1]
                return (d.isRelation ? 0.1 : 1) * currentLayout.settings.linkStrength;
            })
        .theta(0.1) // default is 0.8
        .charge(-10*numberOfNodes * currentLayout.settings.nodeRepulsion)
        .chargeDistance(1000);


    this.force
        .nodes(nodes)
        .links(links)
        .start();
}
ForceLayout.prototype.updateElementPos = function() { 
    svg.selectAll(".node")
        .attr("transform", function(d) {return "translate(" + x(d.x) + "," + y(d.y) + ")";})
        .classed("selected", function(d) { return (d.isSelected); });

    var linkPath = svg.selectAll(".link path");
    linkPath.attr('d', currentLayout.getLinkPathData)
    .each(function  (d) {
        d.textPoint = this.getPointAtLength(this.getTotalLength()/2);
    });

    svg.selectAll(".link text")
        .attr("x", function(d) {return d.textPoint.x;})
        .attr("y", function(d) {return d.textPoint.y;})
        .attr("dx", function(d) {return d.source.y < d.target.y ? 12:-12;})
        .style("text-anchor",function(d) { return d.source.y < d.target.y ? "start":"end"; })
            
    updateDragLine();
    updateViewPortRect(); 
}
ForceLayout.prototype.getLinkPathData = function (d) {
    var newPos = currentLayout.alignTargetPoint(d);
    var sourceX = newPos.sourceX,
        sourceY = newPos.sourceY,
        targetX = newPos.targetX,
        targetY = newPos.targetY,
        dist = newPos.dist;
    if(currentLayout.hasOverlapLink(d)){
        return 'M' + x(sourceX) + ',' + y(sourceY) + 'A' + (dist) * getScaleRatio()+ ',' + (dist)* getScaleRatio() + ' 0 0,1 ' + x(targetX) + ',' + y(targetY);
    }
    else {
        return 'M' + x(sourceX) + ',' + y(sourceY) + 'L' + x(targetX) + ',' + y(targetY);
    }
}
ForceLayout.prototype.drag = nodeForceDrag;
ForceLayout.prototype.setLayoutSize = function (width,height) {
    this.force.size([width,height]);
}

ForceLayout.prototype.exit = function () {
    this.force.stop();
    this.force = null;



    d3.select('#forceLayoutCommand')
    .classed('checked',false);
}


///
/// Tree Layout
///


function TreeLayout() {
    this.name = "Tree";
    this.drag = d3.behavior.drag()
        .on('drag',this.dragmove);
    this.partition = d3.layout.partition()
        .size([svgHeight,svgWidth])
        .value(function(d) { return 1; })
        .sort(function  (a,b) {
            return a.id - b.id;
        })

    this.settingsName = treeLayoutSettings;
    this.initializeSettings();

    this.updateElementPos();

    d3.select('#treeLayoutCommand')
    .classed('checked',true);
}

TreeLayout.prototype = new GraphLayout();
TreeLayout.prototype.updateLayout = function (nodes,links,centerRootNodes,hasNodeTransition,hasLinkTransition) {
    if(_.isEmpty(nodes)&&_.isEmpty(links))
        return;
    this.setLayoutSize(svgWidth,svgHeight);

    nodes.forEach(function(d) { 
        d._children = d.children;
        d.children = []; });

    var globalRoot = {children:[]};
    nodes.forEach(function (d) {
        if(!this.isLayoutRoot(d))
            return;
        this.recurse(d);
        globalRoot.children.push(d);
    },this)

    this.partition.nodes(globalRoot);

    //Partition layout can only generate horizontal layout. Therefore, x and y, width and height should be swapped.
    nodes.forEach(function(d) { 
        var t = d.x;d.x = d.y;d.y = t; 
        t = d.dx; d.dx = d.dy; d.dy = t;
        d.children = d._children;
    })

    svg.selectAll('.link text')
        .attr('dx','0.5em')
        .attr('dy','-0.5em')
        .style('text-anchor','start');

    // svg.selectAll('.node text')
    //     .attr('dx','1em' );

    this.updateElementPos(hasNodeTransition,hasLinkTransition);
}
TreeLayout.prototype.updateElementPos = function (hasNodeTransition,hasLinkTransition) {
    if(hasNodeTransition){
        svg.selectAll('.node')
            .transition()
            .duration(LAYOUT_TRANSITION_DURATION)
            .attr('transform', function(d) { 
                return 'translate(' + x(d.x) + ',' + y(d.y) + ')'; 
            });
        if(!hasLinkTransition)
        {
            svg.select('#linkCanvas')
                .attr('opacity', 0)
                .transition()
                .duration(LAYOUT_TRANSITION_DURATION/2)
                .delay(LAYOUT_TRANSITION_DURATION/2)
                .attr('opacity', 1)
        }
        
    }
    else{
        svg.selectAll('.node')
            .attr('transform', function(d) { 
                return 'translate(' + x(d.x) + ',' + y(d.y) + ')'; 
            });
    }

    if(hasLinkTransition)
    {
        svg.selectAll('.link path')
            .transition()
            .duration(LAYOUT_TRANSITION_DURATION)
            // .attrTween('d',function(d) { 
            //     var a = d3.select(this).attr('d')
            //     var b = currentLayout.getLinkPathData(d);

            //     return d3.interpolate(a,b);
                // var curS = this.getPointAtLength(0);
                // var curT = this.getPointAtLength(this.getTotalLength());
                // var a = {sx:curS.x, sy:curS.y, tx: curT.x, ty: curT.y};
                // var b = {sx:d.source.x, sy:d.source.y, tx: d.target.x, ty: d.target.y};
                // var i = d3.interpolate(a,b)
                // return function(t) { 
                //     var tp = i(t);
                //     var td = {isRelation: d.isRelation, isIllegal:d.isIllegal, source:{x:tp.sx,y:tp.sy},target:{x:tp.tx,y:tp.ty}};
                //     return currentLayout.getLinkPathData(td);
                // }
            // })
            .attr('d', this.getLinkPathData)
            
        svg.selectAll('.link path').each(function(d) { 
                if(!d.textPoint)
                    d.textPoint = this.getPointAtLength(this.getTotalLength()/2);
            })
    }
    else
    {
        svg.selectAll('.link path')
            .attr('d', this.getLinkPathData)
            .each(function(d) { 
                if(!d.textPoint)
                    d.textPoint = this.getPointAtLength(this.getTotalLength()/2);
            })
    }



    svg.selectAll('.link text')
        .attr('x',function(d) { return d.textPoint? d.textPoint.x: 0; })
        .attr('y',function(d) { return d.textPoint? d.textPoint.y: 0; })

    updateViewPortRect(); 
}
TreeLayout.prototype.getLinkPathData = function (d) {
    d.textPoint = null;
    var sx = d.source.x,
        sy = d.source.y,
        tx = d.target.x, 
        ty = d.target.y;

    var dx = Math.abs(tx-sx);
    var dy = Math.abs(ty-sy);

    var padding = LINK_ARROW_PADDING / zoom.scale();

    if(!d.isRelation)
    {
        if(d.isIllegal)
        {
            var pos = currentLayout.alignTargetPoint(d);
            return 'M' + x(pos.sx) + ',' + y(pos.sy) + 'L' + x(pos.tx) + ',' + y(pos.ty);   
        }
        else
        {
            tx += padding*Math.sign(sx-tx);
            d.textPoint = {x:x(sx),y:y(ty)};
            return 'M' + x(sx) + ',' + y(sy) + 'L' + x(sx) + ',' + y(ty) + 'L' + x(tx) + ',' + y(ty); 
        }
    }

    var sweep = 0

    if(!currentLayout.hasOverlapLink(d))
        sweep = ty < sy ? 0:1;
    
    var rx = 0;
    var ry = 0; 

    if(dy/dx < HALF_CIRCLE_RANGE )
    {
        rx = ry = Math.abs(tx - sx)/2;
        ty += padding*Math.sign(sy-ty);
    }
    else if(dx/dy < HALF_CIRCLE_RANGE)
    {
        rx = ry = Math.abs(ty - sy)/2;
        tx += padding*Math.sign(sx-tx);
    }
    else
    {
        rx = Math.abs(sx - tx);
        ry =  Math.abs(sy - ty);
        var pos = currentLayout.alignTargetPoint(d);
        sx = pos.sourceX,sy = pos.sourceY,tx = pos.targetX,ty = pos.targetY;
    }
        
    return 'M' + x(sx) + ',' + y(sy)
    + ' A' + (x(rx)-x(0)) + ","+ (y(ry)-y(0))+" 0 0 "+ sweep +" "+ x(tx) + ',' + y(ty);
}
TreeLayout.prototype.drag = null;
TreeLayout.prototype.dragmove = function () {
    if(!canDrag())
        return;
    selected_nodes.forEach(function(d) { 
        d.x += d3.event.dx/getScaleRatio(),d.y += d3.event.dy/getScaleRatio();
    });
    currentLayout.updateElementPos(); //Here "this" is the dragged element, not TreeLayout
}
TreeLayout.prototype.recurse = function (node) {
    if(_.isEmpty(node._children)||node.isFolded) //Do not include a folded node
        return;

    node._children.forEach(function (d) {
        var link = findLink(node,d);
        link.isIllegal = false;
        if(!link.isRelation)
        {
            if(!_.isEmpty(d.children))
            {
                console.log("cycle")
                link.isIllegal = true;
            }
            else
                node.children.push(d)
        }
    })

    if(!(node.type === xdi.constants.nodetypes.VALUE&&node._children.length == 1))
        node.children.splice(1,0,{id:-1,isForLayout:true,parent:node});

    node.children.forEach(function(d) { this.recurse(d); },this);
}

TreeLayout.prototype.setLayoutSize = function (width,height) {
    //Partition layout can only generate horizontal layout. Therefore, x and y, width and height should be swapped.
    
    var newWidth = height * this.settings.verticalRatio;
    var newHeight = width *  this.settings.horizontalRatio;
    this.partition.size([newWidth,newHeight]); 
}


TreeLayout.prototype.exit = function () {
    this.partition = null;

    d3.select('#treeLayoutCommand')
    .classed('checked',false);
}




Math.sign = function (x) {
    return x&&(x/Math.abs(x));
}
