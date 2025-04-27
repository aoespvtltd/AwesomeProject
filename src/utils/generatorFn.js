export function generateCommand(pins) {
    let command = [];
  
    // Start and Command Bytes
    command.push(0xAA); // Start byte
    command.push(0x01); // Command byte
  
    // Motor count
    let motorCount = pins.length;
    command.push(motorCount);
  
    // Motor details
    pins.forEach(([pin, count]) => {
        command.push(pin);   // Motor ID (pin number)
        command.push(count); // Motor run count
    });
  
    // Calculate checksum (sum of bytes modulo 256)
    let checksum = command.reduce((sum, byte) => sum + byte, 0) & 0xFF;
    // command.push(checksum); // Add checksum
  
    // End byte
    command.push(0x6C)
    command.push(0x55); // End byte

    
    let sendThis = command.map(b => `${b.toString(16).toUpperCase().padStart(2, '0')}`).join("")
  
    return sendThis;
  }