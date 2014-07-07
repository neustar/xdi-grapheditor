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

function initializeLayout (nodes,links,centerRootNodes) {
    switch(currentLayout)
    {
        case Layouts.Force:
            initializeForceLayout(nodes,links,centerRootNodes);
            break;
        case Layouts.Tree:
            initializeTreeLayout(nodes,links,centerRootNodes);
            break;
    }
}

function initializeForceLayout(nodes,links,centerRootNodes) {
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
 	 });                             


	force
    	.gravity(0)
    	.linkDistance(function(d) { 
                // default is 20.
                return 30 + 30*d.source.children.length;
            })
        .linkStrength(function(d) {
                // range is [0,1]
                return d.isRelation ? 0.1 : 1;
            })
        .theta(0.1) // default is 0.8
        .charge(-10*numberOfNodes)
        .chargeDistance(1000);


    force
        .nodes(nodes)
        .links(links)
        .start();
}

function isLayoutRoot (d) {
    return d.isCommonRoot();
}

//Tree

function recurseTreeLayout (node) {
    if(_.isEmpty(node._children))
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

    node.children.forEach(function(d) { recurseTreeLayout(d); });
}
function initializeTreeLayout (nodes,links,centerRootNodes) {
     if(_.isEmpty(nodes)&&_.isEmpty(links))
        return;

    partition = d3.layout.partition()
        .size([svgHeight,svgWidth])
        .value(function(d) { return 1; })
        .sort(function  (a,b) {
            return a.id - b.id;
        })

    nodes.forEach(function(d) { 
        d._children = d.children;
        d.children = []; });

    // var globalRoot = globalNodes[0];
    // recurseTreeLayout(globalRoot);
    var globalRoot = {children:[]};
    nodes.forEach(function (d) {
        if(!isLayoutRoot(d))
            return;
        recurseTreeLayout(d);
        globalRoot.children.push(d);
    })
    
    partition.nodes(globalRoot);
    
    nodes.forEach(function(d) { 
        var t = d.x;d.x = d.y;d.y = t; 
        t = d.dx; d.dx = d.dy; d.dy = t;
        d.children = d._children;
    })


    updateTreeLayout();
}

function updateTreeLayout () {
    svg.selectAll('.node')
        .attr('transform', function(d) { return 'translate(' + x(d.x) + ',' + y(d.y) + ')'; });

    svg.selectAll('.link path')
        .attr('d', getTreeLinkPathD)
        .each(function(d) { 
            if(!d.textPoint)
                d.textPoint = this.getPointAtLength(this.getTotalLength()/2);
        })

    svg.selectAll('.link text')
        .attr('x',function(d) { return d.textPoint? d.textPoint.x: 0; })
        .attr('y',function(d) { return d.textPoint? d.textPoint.y: 0; })
}

function getTreeLinkPathD (d) {
    d.textPoint = null;
    var sx = d.source.x,
        sy = d.source.y,
        tx = d.target.x, 
        ty = d.target.y;

    var dx = Math.abs(tx-sx);
    var dy = Math.abs(ty-sy);

    if(!d.isRelation)
    {
        if(d.isIllegal)
            return 'M' + x(sx) + ',' + y(sy) + 'L' + x(tx) + ',' + y(ty);   
        else
        {
            d.textPoint = {x:x(sx),y:y(ty)};
            return 'M' + x(sx) + ',' + y(sy) + 'L' + x(sx) + ',' + y(ty) + 'L' + x(tx) + ',' + y(ty); 
        }
    }

    var sweep = ty < sy ? 0:1;
    
    var rx = 0;
    var ry = 0; 

    if(dy/dx < HALF_CIRCLE_RANGE )
        rx = ry = Math.abs(tx - sx)/2;
    else if(dx/dy < HALF_CIRCLE_RANGE)
        rx = ry = Math.abs(ty - sy)/2;
    else
    {
        rx = Math.abs(sx - tx);
        ry =  Math.abs(sy - ty);
    }
        
    return 'M' + x(sx) + ',' + y(sy)
    + 'A' + (x(rx)-x(0)) + " "+ (y(ry)-y(0))+" 0 0"+ sweep + x(tx) + ',' + y(ty);
}

var nodeTreeDrag = function  () {
    
}

