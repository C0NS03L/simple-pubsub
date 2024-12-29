import {
  PubSubService,
  MachineSaleEvent,
  MachineRefillEvent,
  MachineSaleSubscriber,
  MachineRefillSubscriber,
  Machine,
} from "./app";

describe("PubSubService", () => {
  let pubSubService: PubSubService;
  let machines: Machine[];
  let saleSubscriber: MachineSaleSubscriber;
  let refillSubscriber: MachineRefillSubscriber;

  beforeEach(() => {
    pubSubService = new PubSubService();
    machines = [new Machine("001"), new Machine("002"), new Machine("003")];
    saleSubscriber = new MachineSaleSubscriber(machines);
    refillSubscriber = new MachineRefillSubscriber(machines);
  });

  test("Sub and Pub Sale", () => {
    pubSubService.subscribe("sale", saleSubscriber);
    const saleEvent = new MachineSaleEvent(2, "001");
    pubSubService.publish(saleEvent);

    expect(machines[0].stockLevel).toBe(8);
  });

  test("Sub and Pub Refill", () => {
    pubSubService.subscribe("refill", refillSubscriber);
    const refillEvent = new MachineRefillEvent(3, "002");
    pubSubService.publish(refillEvent);

    expect(machines[1].stockLevel).toBe(13);
  });

  test("Sale Event Unsubscribe", () => {
    pubSubService.subscribe("sale", saleSubscriber);
    pubSubService.unsubscribe("sale", saleSubscriber);
    const saleEvent = new MachineSaleEvent(2, "001");
    pubSubService.publish(saleEvent);

    expect(machines[0].stockLevel).toBe(10);
  });

  test("Refill Event Unsubscribe", () => {
    pubSubService.subscribe("refill", refillSubscriber);
    pubSubService.unsubscribe("refill", refillSubscriber);
    const refillEvent = new MachineRefillEvent(3, "002");
    pubSubService.publish(refillEvent);

    expect(machines[1].stockLevel).toBe(10);
  });

  test("Multiple Events", () => {
    pubSubService.subscribe("sale", saleSubscriber);
    pubSubService.subscribe("refill", refillSubscriber);

    const events = [
      new MachineSaleEvent(1, "001"),
      new MachineRefillEvent(5, "001"),
      new MachineSaleEvent(2, "002"),
      new MachineRefillEvent(3, "003"),
    ];

    events.map(pubSubService.publish);

    expect(machines[0].stockLevel).toBe(14);
    expect(machines[1].stockLevel).toBe(8);
    expect(machines[2].stockLevel).toBe(13);
  });
});
