<p align="center">
  <img width="200" src="/assets/freedom.png" alt="Vite logo">
</p>

# Freedom

English | [简体中文](README.zh-CN.md)

Freedom is a multi-module automated game script library designed to provide convenient script writing and execution functions. It supports automated cloud game operations by writing scripts, providing a simple and flexible way to control the behavior of the game.

## Features

- **Modular design**: The core module, script module, and application module are separated, supporting flexible expansion and customization.

- **Script execution**: Through simplified script definition and execution methods, operations on the game interface (such as clicking, waiting, input, etc.) can be quickly implemented.

- **Type safety**: Use TypeScript for type-safe development and provide complete type definitions.

- **Extensibility**: Users can expand script modules according to their needs or create custom scripts.

## Usage

[@freedom/scripts](./packages/scripts/README.md)
provides a set of interfaces for writing automation scripts to control the game flow. It allows users to automatically perform a series of predefined actions in the game, such as clicking, waiting for elements, executing custom logic, etc. Through integration with `@freedom/executor`, users can easily automate interactions in cloud games.

## TODO

- [ ] application
- [ ] Script templates and community support
- [ ] Error handling and logging system
- [ ] Script execution monitoring and reporting
