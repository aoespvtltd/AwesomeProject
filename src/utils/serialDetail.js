

export const MOTOR_TYPES = {
    NO_FEEDBACK_ELECTROMAGNET: 0,
    FEEDBACK_ELECTROMAGNET: 1,
    TWO_WIRE_MOTOR: 2,
    THREE_WIRE_MOTOR: 3,
    THREE_LINE_STRONG_THREE_TRACK: 6
  };
  
  // CRC calculation function converted from C to JavaScript
export function calculateCRC(data, length) {
    let MSBInfo;
    let nCRCData = 0xffff;
    
    for (let i = 0; i < length; i++) {
      nCRCData = nCRCData ^ (data[i] & 0xff);
      for (let j = 0; j < 8; j++) {
        MSBInfo = nCRCData & 0x0001;
        nCRCData = nCRCData >> 1;
        if (MSBInfo !== 0) {
          nCRCData = nCRCData ^ 0xa001;
        }
      }
    }
    
    return nCRCData;
  }


export function createMotorRunCmd2(motorIndex) {
    // Create string parts matching the buffer structure
    const boardAddress = "01";        // cmd[0] = 0x01
    const motorRunCmd = "05";         // cmd[1] = 0x05
    const motorIdx = motorIndex.toString(16).padStart(2, '0');  // cmd[2] = motorIndex
    const motorType = "03";           // cmd[3] = THREE_WIRE_MOTOR (0x03)
    const lightScreen = "00";         // cmd[4] = 0x00

    // Create the zero-filled middle part (13 bytes of 0x00)
    const zeros = "00".repeat(13);    // cmd[5] through cmd[17]

    // First create a temporary array to calculate CRC
    const tempArray = [];
    const dataString = boardAddress + motorRunCmd + motorIdx + motorType + lightScreen + zeros;
    
    // Convert hex string to byte array for CRC calculation
    for (let i = 0; i < dataString.length; i += 2) {
        tempArray.push(parseInt(dataString.substr(i, 2), 16));
    }

    // Calculate CRC-16/MODBUS
    const crc = calculateCRC16(tempArray);
    
    // Convert CRC to two bytes (low byte first, then high byte)
    const crcLow = (crc & 0xFF).toString(16).padStart(2, '0');
    const crcHigh = ((crc >> 8) & 0xFF).toString(16).padStart(2, '0');

    // Combine all parts
    const finalCommand = (boardAddress + motorRunCmd + motorIdx + motorType + 
                       lightScreen + zeros + crcLow + crcHigh).toUpperCase();
    
    return finalCommand;
}

function calculateCRC16(bytes) {
    let crc = 0xFFFF;
    for (let i = 0; i < bytes.length; i++) {
        crc ^= bytes[i];
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x0001) !== 0) {
                crc >>= 1;
                crc ^= 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }
    return crc;
}

export function expandArray(arr) {
  const result = [];
  arr.forEach(([num, count]) => {
    for (let i = 0; i < count; i++) {
      if (num <= 10){
        result.push((num-1)*2)
      }else{
        result.push(num+10-1);
      }
    }
  });
  return result;
}


export function createMotorRunCmdsWithArray(array) {
  let hexArray = []
  expandArray(array).forEach(element => {
    let hexData = createMotorRunCmd2(element)
    hexArray.push(hexData)
  });
  return hexArray
}