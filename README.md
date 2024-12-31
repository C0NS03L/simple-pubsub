# Simple PubSub

This project implements a simple publish-subscribe (PubSub) system for managing machine events such as sales, refills, low stock warnings, and stock OK notifications.

## Features

- **PubSub Service**: A singleton service to manage event subscriptions and publications.
- **Machine Repository**: A repository to manage machine data.
- **Event Handling**: Custom events for machine sales, refills, low stock warnings, and stock OK notifications.
- **Subscribers**: Subscribers to handle different types of events.
- **JSDocs doccumentation**: Documentation for the project. (Written with the help from Github Copilot)

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/C0NS03L/simple-pubsub.git
    cd simple-pubsub
    ```

2. Install dependencies:
    ```bash
    bun install
    ```

## Usage

1. Run the main program:
    ```bash
    bun start
    ```

2. Run tests:
    ```bash
    bun test
    ```
