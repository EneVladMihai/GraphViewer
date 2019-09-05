paper.install(window);

let tool = new Tool();

window.onload = () => {
  var canvas = document.getElementById('canvas');
  paper.setup(canvas);

  Graph.fromFile('input.json');
}

class Node {
  constructor(label) {
    this.inEdges = new Array();
    this.outEdges = new Array();
    this.label = label;
    this.radius = 50;

    this.visual = new Group(
      {
        isSelected: false,
        lockedSelection: false,
        select: function () { this.isSelected = true; this.children[0].highlight(); },
        deselect: function () { this.isSelected = false; this.children[0].unhighlight(); },
        toggleSelect: function () { if (!this.lockedSelection) { if (!this.isSelected) this.select(); else this.deselect(); }; this.lockedSelection = false }
      });
    this.visual.onClick = (event) => this.visual.toggleSelect();
  }

  updateVisualOnMouseDrag(event, selectedAfter = false) {
    this.visual.bringToFront();

    this.visual.position.x += event.delta.x;
    this.visual.position.y += event.delta.y;

    this.inEdges.forEach(edge => edge.draw());
    this.outEdges.forEach(edge => edge.draw());

    this.visual.lockedSelection = selectedAfter;
  }
  draw(color = 'black') {
    this.visual.addChildren(
      [
        new Path.Circle({
          center: this.visual.position,
          radius: this.radius,
          strokeColor: color,
          fillColor: 'white',
          strokeWidth: 5,

          defaultColor: color,
          highlightColor: 'green',

          highlight: function () { this.strokeColor = this.highlightColor; },
          unhighlight: function () { this.strokeColor = this.defaultColor; },
        }),

        new PointText(
          {
            point: new Point(this.visual.position.x, this.visual.position.y + this.radius / 3),
            content: this.label,
            fillColor: color,
            fontSize: this.radius,
            justification: 'center'
          })
      ]);
  }

  drawOutEdges(color = 'black') {
    this.outEdges.forEach(edge => edge.draw(color));
  }

  rotate(degrees) {
    this.visual.rotate(degrees, windowCenter());
    this.visual.children[1].rotate(-degrees);
    this.outEdges.forEach(edge => edge.rotate(degrees))
  }
}

class Edge {
  constructor(from, to, label) {
    this.label = label;
    this.from = from;
    this.to = to;
    this.visual = new Group();
  }

  draw(color = 'black') {
    this.visual.removeChildren(0);

    if (!this.from.visual.intersects(this.to.visual)) {
      const helper = new Path.Line(this.from.visual.position, this.to.visual.position);
      helper.remove();

      const fromPoint = helper.getPointAt(this.from.radius);
      const toPoint = helper.getPointAt(helper.length - this.to.radius);
      const arrowFromPoint = helper.getPointAt(helper.length - 1.5 * this.to.radius);

      this.visual.addChildren(
        [
          // Line between two nodes
          new Path.Line(
            {
              from: fromPoint,
              to: toPoint,
              strokeColor: color,
              strokeWidth: 5
            }),

          new PointText(
            {
              point: new Point((fromPoint.x + toPoint.x) / 2, (fromPoint.y + toPoint.y) / 2),
              content: this.label,
              fillColor: 'white',
              strokeColor: 'black',
              fontSize: Math.ceil(3 * Math.sqrt(helper.length)),
              justification: 'center'
            }),

          // Arrow at the end of line
          new Path.Line(
            {
              from: arrowFromPoint,
              to: toPoint,
              strokeColor: color,
              strokeWidth: 5
            }).rotate(20, toPoint),

          new Path.Line(
            {
              from: arrowFromPoint,
              to: toPoint,
              strokeColor: color,
              strokeWidth: 5
            }).rotate(-20, toPoint)
        ]);
      this.visual.bringToFront();
    }
  }
  rotate(degrees) {
    this.visual.rotate(degrees, windowCenter());
    this.visual.children[1].rotate(-degrees);
  }
}

class Graph {
  static async fromFile(fileName) {
    const fileContent = await fetch(fileName, { headers: { 'Content-Type': 'application/json', }, });
    const data = await fileContent.json();
    let g = new Graph(data['labels'], data['edges']);
    g.draw(data['visualFormat']);
  }
  constructor(verticesLables, edges) {
    this.nodes = new Array();
    this.nodeHierarchy = new Map();

    verticesLables.forEach(label => {
      const currentNode = new Node(label);
      this.nodes.push(currentNode);
      this.nodeHierarchy.set(currentNode, 0);

      currentNode.visual.onMouseDrag = (event) => {
        currentNode.visual.select();
        let selectedNodes = Array();
        this.nodes.forEach(node => {
          if (node.visual.isSelected)
            selectedNodes.push(node);
        });
        selectedNodes.forEach(node => {
          node.updateVisualOnMouseDrag(event, selectedNodes.length > 1);
        });
      }
    });

    edges.forEach(edge => {
      const currentEdge = new Edge(this.nodes[edge[0]], this.nodes[edge[1]], edge[2]);
      this.nodes[edge[0]].outEdges.push(currentEdge);
      this.nodes[edge[1]].inEdges.push(currentEdge);
    });
    tool.onKeyDown = (event) => {
      if (event.modifiers.shift && event.key == 'a')
        this.nodes.forEach(node => {
          node.visual.select();
        });
      if (event.modifiers.shift && event.key == 'd')
        this.nodes.forEach(node => {
          node.visual.deselect();
        });
    }

  }

  draw(format)
  {
    switch (format) {
      case 'random':
        this.drawRandom();
        break;
      case 'polygon':
        this.drawPolygon();
        break;
      case 'topologically sorted':
        this.drawSorted();
        break;
    
      default: this.drawRandom();
        break;
    }
  }
  drawRandom(color = 'black') {
    this.nodes.forEach(node => {
      node.visual.position.x = randInt(node.radius, window.innerWidth - node.radius);
      node.visual.position.y = randInt(node.radius, window.innerHeight - node.radius);
      node.draw(color);
    });
    this.nodes.forEach(node => node.drawOutEdges(color));
  }

  drawPolygon(color = 'black') {
    const polygon = new Path.RegularPolygon(windowCenter(), this.nodes.length,
      Math.floor((2 / 5) * Math.min(window.innerWidth, window.innerHeight)));
    polygon.remove();

    for (let i = 0; i < polygon.segments.length; i++) {
      this.nodes[i].visual.position = polygon.segments[i].point;
      this.nodes[i].draw(color);
    }
    this.nodes.forEach(node => node.drawOutEdges(color));
  }

  drawSorted(color = 'black') {
    this.setHiercarcyUsingTopologicalSort();
    const noOfLvls = this.getNoOfLvls();

    const vericalSplits = window.innerHeight / (noOfLvls + 1);

    for (let lvl = 0; lvl < noOfLvls; lvl++) {
      const nodesOnCurrentLvl = this.getNodesOnLvl(lvl);
      const horizontalSplits = window.innerWidth / (nodesOnCurrentLvl.length + 1);

      for (let nodeIdx = 0; nodeIdx < nodesOnCurrentLvl.length; nodeIdx++) {
        const cn = nodesOnCurrentLvl[nodeIdx];

        cn.visual.position.x = (nodeIdx + 1) * horizontalSplits;

        // The top left corner of the canvas is (0, 0)
        // so the y axis is reverted if consider the ususal cartesian system
        cn.visual.position.y = (noOfLvls - lvl) * vericalSplits;

        cn.draw(color);
      }
    }
    this.nodes.forEach(node => node.drawOutEdges(color));
  }

  rotate(degrees) {
    this.nodes.forEach(node => node.rotate(degrees));
  }

  getNoOfLvls() {
    let levels = new Array();
    this.nodeHierarchy.forEach((value, key) => {
      if (levels.indexOf(value) === -1)
        levels.push(value);
    });
    return levels.length;
  }

  getNodesOnLvl(lvl) {
    let nodesOnLvl = new Array();
    this.nodeHierarchy.forEach((value, key) => {
      if (value === lvl)
        nodesOnLvl.push(key);
    });
    return nodesOnLvl;
  }

  setHiercarcyUsingTopologicalSort() {
    let queue = new Array();
    let noOfInEdges = new Map();

    this.nodes.forEach(node => {
      noOfInEdges.set(node, node.inEdges.length);
      if (noOfInEdges.get(node) === 0) {
        queue.push(node);
      }
    });

    while (queue.length > 0) {
      const currentNode = queue.shift();
      currentNode.outEdges.forEach(edge => {
        noOfInEdges.set(edge.to, noOfInEdges.get(edge.to) - 1);
        if (noOfInEdges.get(edge.to) === 0) {
          queue.push(edge.to);
          this.nodeHierarchy.set(edge.to, this.nodeHierarchy.get(currentNode) + 1);
        }
      });
    }
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function windowCenter() {
  return new Point(window.innerWidth / 2, window.innerHeight / 2);
}