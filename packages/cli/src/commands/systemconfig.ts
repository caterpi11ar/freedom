import { getStore } from '@freedom/shared'
import { configManager, getConfig, setConfigValue } from '@freedom/shared/config'
import chalk from 'chalk'

export async function systemConfigCommand(): Promise<void> {
  const store = getStore()

  console.log(chalk.cyan('\n🔧 System Configuration Manager'))
  console.log(chalk.gray('Manage Freedom configuration settings\n'))

  while (true) {
    console.log(chalk.yellow('Available operations:'))
    console.log('  1. List all configurations')
    console.log('  2. Get configuration value')
    console.log('  3. Set configuration value')
    console.log('  4. Reset configuration')
    console.log('  5. Exit')

    const choice = await store.prompt({
      type: 'select',
      message: 'Select operation:',
      choices: [
        { value: 'list', name: 'List all configurations' },
        { value: 'get', name: 'Get configuration value' },
        { value: 'set', name: 'Set configuration value' },
        { value: 'reset', name: 'Reset configuration' },
        { value: 'exit', name: 'Exit' },
      ],
    })

    switch (choice) {
      case 'list':
        await listConfigurations()
        break

      case 'get':
        await getConfiguration()
        break

      case 'set':
        await setConfiguration()
        break

      case 'reset':
        await resetConfiguration()
        break

      case 'exit':
        console.log(chalk.green('✅ Configuration manager closed'))
        return
    }

    console.log() // 空行分隔
  }
}

async function listConfigurations(): Promise<void> {
  try {
    const config = await getConfig()

    console.log(chalk.blue('\n📋 Current Configuration:'))
    console.log(chalk.gray('─'.repeat(50)))

    // Settings
    console.log(chalk.yellow('Settings:'))
    console.log(`  theme: ${config.settings.theme}`)
    console.log(`  verbosity: ${config.settings.cli.verbosity}`)
    console.log(`  interactive: ${config.settings.cli.interactive}`)
    console.log(`  locale: ${config.settings.cli.locale}`)
    console.log(`  autoUpdate: ${config.settings.features.autoUpdate}`)
    console.log(`  enableTelemetry: ${config.settings.features.enableTelemetry}`)

    // Accounts
    console.log(chalk.yellow('\nAccounts:'))
    if (config.accounts.defaultAccount) {
      console.log(`  defaultAccount: ${config.accounts.defaultAccount}`)
    }
    const accountCount = Object.keys(config.accounts.accounts).length
    console.log(`  configured accounts: ${accountCount}`)

    if (accountCount > 0) {
      console.log('  accounts:')
      for (const [name, account] of Object.entries(config.accounts.accounts)) {
        console.log(`    ${name}: ${account.region} region`)
      }
    }
  }
  catch (error) {
    console.error(chalk.red('❌ Failed to load configuration:'), error)
  }
}

async function getConfiguration(): Promise<void> {
  const store = getStore()

  const key = await store.prompt({
    type: 'input',
    message: 'Enter configuration key (e.g., settings.theme):',
    validate: (value: string) => value.trim().length > 0 || 'Key cannot be empty',
  })

  try {
    const value = configManager.get(key.trim())

    if (value === undefined) {
      console.log(chalk.yellow(`⚠️  Configuration key "${key}" not found`))
    }
    else {
      console.log(chalk.green(`✅ ${key}: ${JSON.stringify(value, null, 2)}`))
    }
  }
  catch (error) {
    console.error(chalk.red('❌ Failed to get configuration:'), error)
  }
}

async function setConfiguration(): Promise<void> {
  const store = getStore()

  const key = await store.prompt({
    type: 'input',
    message: 'Enter configuration key (e.g., settings.theme):',
    validate: (value: string) => value.trim().length > 0 || 'Key cannot be empty',
  })

  const value = await store.prompt({
    type: 'input',
    message: 'Enter configuration value:',
    validate: (value: string) => value.trim().length > 0 || 'Value cannot be empty',
  })

  try {
    // 尝试解析 JSON 值
    let parsedValue: any
    try {
      parsedValue = JSON.parse(value.trim())
    }
    catch {
      parsedValue = value.trim()
    }

    await setConfigValue(key.trim(), parsedValue)
    console.log(chalk.green(`✅ Configuration updated: ${key} = ${JSON.stringify(parsedValue)}`))
  }
  catch (error) {
    console.error(chalk.red('❌ Failed to set configuration:'), error)
  }
}

async function resetConfiguration(): Promise<void> {
  const store = getStore()

  const confirm = await store.prompt({
    type: 'confirm',
    message: 'Are you sure you want to reset all configuration to defaults?',
    default: false,
  })

  if (!confirm) {
    console.log(chalk.yellow('🚫 Reset cancelled'))
    return
  }

  try {
    await configManager.reload()
    console.log(chalk.green('✅ Configuration reset to defaults'))
  }
  catch (error) {
    console.error(chalk.red('❌ Failed to reset configuration:'), error)
  }
}
