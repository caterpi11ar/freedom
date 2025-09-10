# Freedom CLI Documentation

Welcome to the Freedom CLI documentation! This directory contains comprehensive guides, tutorials, and references for using and developing with Freedom.

## 📚 Documentation Overview

### For Users
- **[User Guide](./user-guide.md)** - Complete guide to using Freedom CLI
- **[Basic Usage Examples](./examples/basic-usage.md)** - Step-by-step examples and tutorials
- **[Troubleshooting Guide](#troubleshooting)** - Common issues and solutions

### For Developers
- **[Developer Guide](./developer-guide.md)** - Architecture, development setup, and contribution guidelines
- **[Extension Development Tutorial](./examples/extension-development.md)** - Learn to create powerful extensions
- **[API Reference](#api-reference)** - Complete API documentation

### Architecture & Design
- **[Project Architecture](./architecture.md)** - System design and component overview
- **[Extension System](./extensions.md)** - Extension architecture and API
- **[Configuration Management](./configuration.md)** - Multi-layer configuration system

## 🚀 Quick Start

### Installation
```bash
git clone https://github.com/caterpi11ar/freedom.git
cd freedom
pnpm install
pnpm build
```

### First Run
```bash
# Development mode
pnpm dev

# Production build
pnpm bundle && node bundle/freedom.js
```

### Basic Usage
```bash
freedom> /help          # Show all commands
freedom> /game start     # Start game session
freedom> /script list    # List available scripts
freedom> /extension list # List extensions
```

## 📖 Learning Path

### 1. New Users
1. Read the [User Guide](./user-guide.md)
2. Try [Basic Usage Examples](./examples/basic-usage.md)
3. Explore available commands with `/help`

### 2. Extension Developers
1. Review the [Developer Guide](./developer-guide.md)
2. Follow the [Extension Development Tutorial](./examples/extension-development.md)
3. Study the Extension API documentation

### 3. Core Contributors
1. Understand the [Project Architecture](./architecture.md)
2. Set up the development environment
3. Review contribution guidelines in [Developer Guide](./developer-guide.md)

## 🔧 Command Categories

### Game Management
- `/game start` - Start game session
- `/game stop` - Stop game session  
- `/game status` - Show session status
- `/game restart` - Restart session

### Script Management
- `/script list` - List all scripts
- `/script run` - Execute a script
- `/script create` - Create new script
- `/script edit` - Edit existing script

### Configuration
- `/config get` - Get configuration value
- `/config set` - Set configuration value
- `/config list` - List all configuration
- `/config reset` - Reset configuration

### Extensions
- `/extension list` - List extensions
- `/extension install` - Install extension
- `/extension enable` - Enable extension
- `/extension disable` - Disable extension

### Debugging
- `/debug log` - View logs
- `/debug doctor` - System diagnostics
- `/debug monitor` - Performance monitoring

## 🎯 Key Features

### ✨ User-Friendly CLI
- Interactive command interface
- Context-aware help system
- Rich terminal output with colors
- Progress indicators and status updates

### 🔌 Powerful Extension System
- Dynamic loading and unloading
- Secure permission model
- Rich API for game interaction
- Development tools and scaffolding

### ⚙️ Flexible Configuration
- Multi-layer configuration system
- Environment-specific settings
- Configuration validation and migration
- Backup and restore capabilities

### 🧪 Comprehensive Testing
- Test environment management
- Data generation and validation
- Integration test runner
- Performance benchmarking

### 🔍 Advanced Debugging
- Real-time performance monitoring
- Comprehensive logging system
- System health diagnostics
- Error tracking and reporting

## 🛠️ Development

### Project Structure
```
freedom/
├── packages/           # Monorepo packages
│   ├── cli/           # CLI interface
│   ├── core/          # Game automation core
│   ├── shared/        # Shared utilities
│   └── test-utils/    # Testing tools
├── docs/              # Documentation
├── extensions/        # Default extensions
└── scripts/          # Build and utility scripts
```

### Tech Stack
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Package Manager**: pnpm
- **Browser Automation**: Playwright
- **CLI Framework**: yargs
- **Testing**: Vitest
- **Build Tool**: esbuild

### Code Quality
- **Linting**: ESLint with @antfu/eslint-config
- **Type Checking**: TypeScript strict mode
- **Testing**: Comprehensive test coverage
- **Documentation**: JSDoc and markdown

## 📋 Troubleshooting

### Common Issues

#### Installation Problems
```bash
# Clear dependencies and reinstall
rm -rf node_modules packages/*/node_modules
pnpm install
```

#### Build Issues
```bash
# Clean build artifacts
pnpm clean
pnpm build
```

#### Runtime Errors
```bash
# Run system diagnostics
freedom> /debug doctor

# Check logs
freedom> /debug log --level error
```

### Getting Help
- Check the [User Guide](./user-guide.md) for detailed instructions
- Use `/help` command for inline assistance
- Report issues on [GitHub Issues](https://github.com/caterpi11ar/freedom/issues)
- Join discussions on [GitHub Discussions](https://github.com/caterpi11ar/freedom/discussions)

## 🤝 Contributing

We welcome contributions! Please see the [Developer Guide](./developer-guide.md) for:
- Development setup
- Coding standards
- Pull request process
- Architecture guidelines

### Quick Contribution Steps
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run quality checks: `pnpm quality`
5. Submit a pull request

## 📄 License

Freedom is released under the MIT License. See [LICENSE](../LICENSE) for details.

## 🙏 Acknowledgments

- **Playwright Team** - For the excellent browser automation framework
- **Node.js Community** - For the robust runtime environment
- **TypeScript Team** - For the powerful type system
- **Open Source Contributors** - For inspiration and best practices

---

**Note**: Freedom is designed for educational and research purposes. Please use responsibly and respect game terms of service.

## 📞 Contact

- **Project Repository**: https://github.com/caterpi11ar/freedom
- **Issues**: https://github.com/caterpi11ar/freedom/issues
- **Discussions**: https://github.com/caterpi11ar/freedom/discussions
- **Email**: daiqin1046@gmail.com

---

*Last Updated: December 2024*