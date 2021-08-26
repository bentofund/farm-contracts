const fs = require('fs')
const path = require('path')
const branch = require('git-branch');

function getSavedContractAddresses() {
    let json
    let gitBranch = branch.sync()
    try {
        json = fs.readFileSync(path.join(__dirname, `../deployments/${gitBranch}-addresses.json`))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json)
}

function saveContractAddress(network, contract, address) {
    const addrs = getSavedContractAddresses()
    addrs[network] = addrs[network] || {}
    addrs[network][contract] = address
    let gitBranch = branch.sync()
    fs.writeFileSync(path.join(__dirname, `../deployments/${gitBranch}-addresses.json`), JSON.stringify(addrs, null, '    '))
}

function getSavedContractAbis(env) {
    if(!env) {
        env = 'local'
    }
    let json
    let gitBranch = branch.sync()
    try {
        json = fs.readFileSync(path.join(__dirname, `../deployments/${gitBranch}-abis.json`))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json)
}

function saveContractAbis(network, contract, bytecode, env) {
    if(!env) {
        env = 'local'
    }
    const bytecodes = getSavedContractAbis()
    bytecodes[network] = bytecodes[network] || {}
    bytecodes[network][contract] = bytecode
    let gitBranch = branch.sync()
    fs.writeFileSync(path.join(__dirname, `../deployments/${gitBranch}-abis.json`), JSON.stringify(bytecodes, null, '    '))
}

module.exports = {
    getSavedContractAddresses,
    saveContractAddress,
    getSavedContractAbis,
    saveContractAbis
}
