import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceX,
    forceY,
} from 'd3-force';
import React, {useCallback, useMemo, useRef} from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Panel,
    useNodesState,
    useEdgesState,
    useReactFlow,
    useNodesInitialized,
} from '@xyflow/react';

import {initialNodes, initialEdges} from './nodes-edges.js';
import {collide} from './collide.js';

import '@xyflow/react/dist/style.css';

const simulation = forceSimulation()
    .force('charge', forceManyBody().strength(-1000))
    .force('x', forceX().x(0).strength(0.05))
    .force('y', forceY().y(0).strength(0.05))
    .force('collide', collide())
    .alphaTarget(0.05)
    .stop();

const useLayoutedElements = (draggingNodeRef) => {
    const {getNodes, setNodes, getEdges, fitView} = useReactFlow();
    const initialized = useNodesInitialized();

    return useMemo(() => {
        let nodes = getNodes().map((node) => ({
            ...node,
            x: node.position.x,
            y: node.position.y,
        }));
        let edges = getEdges().map((edge) => edge);
        let running = false;

        // If React Flow hasn't initialized our nodes with a width and height yet, or
        // if there are no nodes in the flow, then we can't run the simulation!
        if (!initialized || nodes.length === 0) return [false, {}];


        simulation.nodes(nodes).force(
            'link',
            forceLink(edges)
                .id((d) => d.id)
                .strength(0.05)
                .distance(100),
        );

        // The tick function is called every animation frame while the simulation is
        // running and progresses the simulation one step forward each time.
        const tick = () => {
            getNodes().forEach((node, i) => {

                const dragging = draggingNodeRef?.current?.id === node.id

                // Setting the fx/fy properties of a node tells the simulation to "fix"
                // the node at that position and ignore any forces that would normally
                // cause it to move.
                if (dragging) {
                    nodes[i].fx = node.position.x;
                    nodes[i].fy = node.position.y;
                } else {
                    delete nodes[i].fx;
                    delete nodes[i].fy;
                }
            });

            simulation.tick();
            setNodes(
                nodes.map((node) => ({...node, position: {x: node.fx ?? node.x, y: node.fy ?? node.y}})),
            );

            window.requestAnimationFrame(() => {
                // Give React and React Flow a chance to update and render the new node
                // positions before we fit the viewport to the new layout.
                fitView();

                // If the simulation hasn't been stopped, schedule another tick.
                if (running) tick();
            });
        };

        const toggle = () => {
            if (!running) {
                getNodes().forEach((node, index) => {
                    let simNode = nodes[index];
                    Object.assign(simNode, node);
                    simNode.x = node.position.x
                    simNode.y = node.position.y
                })
            }
            running = !running;
            running && window.requestAnimationFrame(tick);
        };

        const isRunning = () => running;

        return [true, {toggle, isRunning}];
    }, [initialized]);
};

const LayoutFlow = () => {
    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, , onEdgesChange] = useEdgesState(initialEdges);
    const draggingNodeRef = useRef(undefined);
    const [initialized, {toggle, isRunning}] = useLayoutedElements(draggingNodeRef);

    const onNodeDragStart = useCallback(
        (_event, node) => {
            draggingNodeRef.current = {...node};
        },
        []
    );

    const onNodeDragStop = useCallback(() => {
        console.log('stop call back')
        draggingNodeRef.current = undefined;
    }, []);

    const onNodeDrag = useCallback(
        (_event, node) => {
            draggingNodeRef.current = {...node};
        },
        []
    );


    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            onNodeDrag={onNodeDrag}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
        >
            <Panel>
                {initialized && (
                    <button onClick={toggle}>
                        {isRunning() ? 'Stop' : 'Start'} force simulation
                    </button>
                )}
            </Panel>
        </ReactFlow>
    );
};

export default function () {
    return (
        <ReactFlowProvider>
            <LayoutFlow/>
        </ReactFlowProvider>
    );
}
