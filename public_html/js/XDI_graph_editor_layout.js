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

var GraphLayout = {
    hasOverlapLink:function (linkD) {
        return (!findLink(linkD.target,linkD.source)||!findLink(linkD.source,linkD.target))
    },
    isLayoutRoot: function (nodeD) {
        return nodeD.isCommonRoot();
    }
}

var ForceLayout = {
    __proto__:GraphLayout,
    initialize:function() { 
        force = d3.layout.force()
            .size([svgWidth, svgHeight])
            .on("tick", ForceLayout.updateElementPos)
            .on('end',updateViewPortRect);
    },

    updateLayout:function(nodes,links,centerRootNodes) {
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
    },

    updateElementPos:function() { 
        svg.selectAll(".node")
            .attr("transform", function(d) {return "translate(" + x(d.x) + "," + y(d.y) + ")";})
            .classed("selected", function(d) { return (d.isSelected); });

        var linkPath = svg.selectAll(".link path");
        linkPath.attr('d', ForceLayout.getLinkPathData)
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
    },
    getLinkPathData:function (d) {
        var deltaX = d.target.x - d.source.x,
            deltaY = d.target.y - d.source.y,
            dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
            normX = deltaX / dist,
            normY = deltaY / dist,
            sourcePadding = d.left ? 17 : 2,
            targetPadding = d.right ? 17 : 2;

        sourcePadding =  sourcePadding / zoom.scale();
        targetPadding = targetPadding / zoom.scale();

        sourceX = d.source.x + (sourcePadding * normX);
        sourceY = d.source.y + (sourcePadding * normY);
        targetX = d.target.x - (targetPadding * normX);
        targetY = d.target.y - (targetPadding * normY);

        var valence1 = d.source.id + "-" + d.target.id;
        var valence2 = d.target.id + "-" + d.source.id;

        var tmpMap = lastDrawData ? lastDrawData.map : globalNodeLinkMap; //Use the lastest map that only has the visible links

        if ((valence1 in tmpMap) && (valence2 in tmpMap)) {
            return 'M' + x(sourceX) + ',' + y(sourceY) + 'A' + (dist) * getScaleRatio()+ ',' + (dist)* getScaleRatio() + ' 0 0,1 ' + x(targetX) + ',' + y(targetY);
        }
        else {
            return 'M' + x(sourceX) + ',' + y(sourceY) + 'L' + x(targetX) + ',' + y(targetY);
        }
    },
    drag:nodeForceDrag
};

var TreeLayout = {
    __proto__:GraphLayout,
    initialize:function () {
        TreeLayout.drag = d3.behavior.drag()
        .on('drag',TreeLayout.dragmove);
    },
    updateLayout:function (nodes,links) {
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

        var globalRoot = {children:[]};
        nodes.forEach(function (d) {
            if(!TreeLayout.isLayoutRoot(d))
                return;
            TreeLayout.recurse(d);
            globalRoot.children.push(d);
        })

        partition.nodes(globalRoot);

        nodes.forEach(function(d) { 
            var t = d.x;d.x = d.y;d.y = t; 
            t = d.dx; d.dx = d.dy; d.dy = t;
            d.children = d._children;
        })

        TreeLayout.updateElementPos();
    },
    updateElementPos:function () {
        svg.selectAll('.node')
        .attr('transform', function(d) { return 'translate(' + x(d.x) + ',' + y(d.y) + ')'; });

        svg.selectAll('.link path')
            .attr('d', TreeLayout.getLinkPathData)
            .each(function(d) { 
                if(!d.textPoint)
                    d.textPoint = this.getPointAtLength(this.getTotalLength()/2);
            })

        svg.selectAll('.link text')
            .attr('x',function(d) { return d.textPoint? d.textPoint.x: 0; })
            .attr('y',function(d) { return d.textPoint? d.textPoint.y: 0; })

        updateViewPortRect(); 
    },
    getLinkPathData:function (d) {
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

        var sweep = 0

        if(!findLink(d.source,d.target)||!findLink(d.target,d.source))
            sweep = ty < sy ? 0:1;
        
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
    },
    drag:null,
    dragmove:function () {
        if(!canDrag())
            return;
        selected_nodes.forEach(function(d) { 
            d.x += d3.event.dx/getScaleRatio(),d.y += d3.event.dy/getScaleRatio();
        });
        TreeLayout.updateElementPos();
    },
    recurse: function (node) {
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

        node.children.forEach(function(d) { TreeLayout.recurse(d); });
    }


}
