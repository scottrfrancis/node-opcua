import "should";
import * as sinon from "sinon";
import { resolveNodeId } from "node-opcua-nodeid";
import {
    NodeIdManager,
    AddressSpace,
    generateAddressSpace,
} from "..";

import { coerceQualifiedName, NodeClass } from "node-opcua-data-model";

describe("NodeIdManager", () => {


    const namespaceUri = "urn:namespace";
    let addressSpace: AddressSpace;
    let nodeIdManager: NodeIdManager;
    beforeEach(async () => {


        addressSpace = AddressSpace.create();
        const ns = addressSpace.registerNamespace(namespaceUri);
        const nodesetsXML = [];
        await generateAddressSpace(addressSpace, nodesetsXML);

        nodeIdManager = new NodeIdManager(1);

    });
    afterEach(() => {
        addressSpace.dispose();
    });

    it("should register a new node id", () => {
        const index = 1;
        const nodeId = nodeIdManager.buildNewNodeId(addressSpace);
        nodeId.toString().should.eql("ns=1;i=1000");
    });

    it("should register a new node id", () => {
        const index = 1;

        const nodeId1 = nodeIdManager.buildNewNodeId(addressSpace);
        nodeId1.toString().should.eql("ns=1;i=1000");

        const nodeId2 = nodeIdManager.buildNewNodeId(addressSpace);
        nodeId2.toString().should.eql("ns=1;i=1001");
    });

    it("should constructNodeId with s=STRING form", () => {

        nodeIdManager.setCache([
            ["Person", 100, NodeClass.ObjectType],
            ["Person_Name", 200, NodeClass.Variable],
        ]);
        const options = { nodeId: "s=Hello" };
        const nodeId1 = nodeIdManager.constructNodeId(addressSpace, options);
        nodeId1.toString().should.eql("ns=1;s=Hello");
    });
    it("should constructNodeId with ns=1;s=MyBoiler form", () => {
        const options = { nodeId: "ns=1;s=MyBoiler" };
        const nodeId1 = nodeIdManager.constructNodeId(addressSpace, options);
        nodeId1.toString().should.eql("ns=1;s=MyBoiler");
    });

    it("should constructNodeId with i=123 form", () => {
        const options = { nodeId: "i=123" };
        const nodeId1 = nodeIdManager.constructNodeId(addressSpace, options);
        nodeId1.toString().should.eql("ns=1;i=123");
    });

    it("should constructNodeId with CoercibleString form", () => {
        const options = { nodeId: "CloseSecureChannelRequest_Encoding_DefaultXml" }
        const nodeId1 = nodeIdManager.constructNodeId(addressSpace, options);
        nodeId1.toString().should.eql("ns=1;i=1000");

        //  however, on namespace 0 
        const nodeIdManager0 = new NodeIdManager(0);
        const nodeId2 = nodeIdManager0.constructNodeId(addressSpace, options);
        nodeId2.toString().should.eql("ns=0;i=451");

    });

    it("should constructNodeId with SomeName form", () => {
        nodeIdManager.setCache(
            [
                ["SomeName", 10001, NodeClass.Variable]
            ],
        );
        const options = { nodeId: "SomeName" };
        const nodeId1 = nodeIdManager.constructNodeId(addressSpace, options);
        nodeId1.toString().should.eql("ns=1;i=10001");
    });

    it("should constructNodeId with SomeName_SomeProp form", () => {
        nodeIdManager.setCache(
            [
                ["SomeName", 10001, NodeClass.Variable]
            ],
        );
        const options = { nodeId: "SomeName_SomeProp" };
        const nodeId1 = nodeIdManager.constructNodeId(addressSpace, options);
        nodeId1.toString().should.eql("ns=1;i=1000");

        const nodeId2 = nodeIdManager.constructNodeId(addressSpace, options);
        nodeId2.toString().should.eql("ns=1;i=1000");
    });

    it("should maintain a list of Symbol and recycle the one that exists already", () => {
        nodeIdManager.setCache(
            [
                ["SomeName", 1000, NodeClass.Object]
            ],
        );

        (nodeIdManager as any)._isInCache(1000).should.eql(true);

        nodeIdManager.findParentNodeId = (addressSpace: AddressSpace) => {
            return resolveNodeId(1000);
        };

        const options = { browseName: coerceQualifiedName("Property1"), nodeClass: NodeClass.Variable };
        const nodeId1 = nodeIdManager.constructNodeId(addressSpace, options);
        nodeId1.toString().should.eql("ns=1;i=1001");
        nodeIdManager.getSymbolCSV().should.eql(`SomeName,1000,Object\nSomeName_Property1,1001,Variable`);

        const options2 = { nodeId: "SomeName_Property1", nodeClass: NodeClass.Variable };
        const nodeId2 = nodeIdManager.constructNodeId(addressSpace, options2);
        nodeId2.toString().should.eql("ns=1;i=1001");

        nodeIdManager.getSymbolCSV().should.eql(`SomeName,1000,Object\nSomeName_Property1,1001,Variable`);
    });
    it("should maintain a list of Symbol and recycle the one that exists already", () => {

        const options1 = {
            browseName: coerceQualifiedName("MyNewDataType"),
            nodeClass: NodeClass.ObjectType,
            references: []
        };

        const nodeId1 = nodeIdManager.constructNodeId(addressSpace, options1);
        nodeId1.toString().should.eql("ns=1;i=1000");
        nodeIdManager.getSymbolCSV().should.eql(`MyNewDataType,1000,ObjectType`);

        nodeIdManager.findParentNodeId = (addressSpace: AddressSpace) => nodeId1;


        const options2 = {
            browseName: coerceQualifiedName("Property1"),
            nodeClass: NodeClass.Variable
        };
        const nodeId2 = nodeIdManager.constructNodeId(addressSpace, options2);
        nodeId2.toString().should.eql("ns=1;i=1001");

        nodeIdManager.getSymbolCSV().should.eql(
            `MyNewDataType,1000,ObjectType\nMyNewDataType_Property1,1001,Variable`);

    });
});
