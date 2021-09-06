import { Component, NgZone } from '@angular/core';
import { BleClient, BleDevice } from '@capacitor-community/bluetooth-le';
import { BehaviorSubject, from } from 'rxjs';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const IMU_SERVICE = 'ff278bc5-3e44-4d81-9817-4c20a1efea68';
const ACCEL_CHARACTERISTIC = 'ff278bc5-3e44-4d81-9817-4c20a1efea69';
const GYRO_CHARACTERISTIC = 'ff278bc5-3e44-4d81-9817-4c20a1efea70';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {
  private device: BleDevice;
  public connected = new BehaviorSubject<boolean>(false);
  public showConnect = false;
  public xAcceleration: string;
  public yAcceleration: string;
  public zAcceleration: string;
  public xGyro: string;
  public yGyro: string;
  public zGyro: string;

  constructor(private ngZone: NgZone) {
    this.xAcceleration = '0.00';
    this.yAcceleration = '0.00';
    this.zAcceleration = '0.00';
    this.xGyro = '0.00';
    this.yGyro = '0.00';
    this.zGyro = '0.00';

    this.connected.subscribe(() => {
      from(Filesystem.mkdir({
        path: 'imu',
        directory: Directory.Documents,
      })).subscribe(() => this.update())
    });
  }

  public async disconnect(): Promise<void> {
    await BleClient.disconnect(this.device.deviceId);
    this.connected.next(false);
  }

  connect(): void {
    from(BleClient.initialize()).subscribe(() => {
      from(BleClient.requestDevice({
        services: [IMU_SERVICE],
        optionalServices: [],
      })).subscribe((d) => {
        this.device = d;
        from(BleClient.connect(this.device.deviceId)).subscribe(() => {
          this.connected.next(true);
          console.log('connected to device', this.device);
        });
      });
    })
  }

  bytesToString(buffer) {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
  }

  update(): void {
    if (this.connected.value) {
      BleClient.startNotifications(
        this.device.deviceId,
        IMU_SERVICE,
        ACCEL_CHARACTERISTIC,
        (value) => {
          this.ngZone.run(() => {
            [this.xAcceleration, this.yAcceleration, this.zAcceleration] = this.bytesToString(value.buffer.slice(value.byteOffset)).split(',');
            Filesystem.appendFile({
              path: `imu/${new Date().getTime()}-acc-data.csv`,
              data: [new Date().getTime(), this.xAcceleration, this.yAcceleration, this.zAcceleration].join(',') + '\n',
              directory: Directory.Documents,
              encoding: Encoding.UTF8,
            });
          })
        }
      )
      BleClient.startNotifications(
        this.device.deviceId,
        IMU_SERVICE,
        GYRO_CHARACTERISTIC,
        (value) => {
          this.ngZone.run(() => {
            [this.xGyro, this.yGyro, this.zGyro] = this.bytesToString(value.buffer.slice(value.byteOffset)).split(',');
            Filesystem.appendFile({
              path: `imu/${new Date().getTime()}-gyro-data.csv`,
              data: [new Date().getTime(), this.xGyro, this.yGyro, this.zGyro].join(',') + '\n',
              directory: Directory.Documents,
              encoding: Encoding.UTF8,
            });
          })
        }
      )
    }
  }

}
