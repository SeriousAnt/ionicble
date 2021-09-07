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
  private static readonly FOLDER_PATH = 'imu';
  private static readonly FILE_PATH_SUFFIX = '-data.csv';
  private device: BleDevice;

  public connected = new BehaviorSubject<boolean>(false);
  public testStartDate: Date;
  public numberOfGyroMeasurements = 0;
  public numberOfAccelMeasurements = 0;

  public xAcceleration: string = '0.00';
  public yAcceleration: string = '0.00';
  public zAcceleration: string = '0.00';
  public xGyro: string = '0.00';
  public yGyro: string = '0.00';
  public zGyro: string = '0.00';

  constructor(private ngZone: NgZone) {
    this.connected.subscribe(() => {
      Filesystem.mkdir({
        path: Tab1Page.FOLDER_PATH,
        directory: Directory.Documents,
      }).finally(() => this.update())
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
          this.testStartDate = new Date();
          console.log('connected to device', this.device.deviceId);
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
            this.numberOfAccelMeasurements++;
            Filesystem.appendFile({
              path: `${Tab1Page.FOLDER_PATH}/${this.getFilePrefix()}acc${Tab1Page.FILE_PATH_SUFFIX}`,
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
            this.numberOfGyroMeasurements++;
            Filesystem.appendFile({
              path: `${Tab1Page.FOLDER_PATH}/${this.getFilePrefix()}gyro${Tab1Page.FILE_PATH_SUFFIX}`,
              data: [new Date().getTime(), this.xGyro, this.yGyro, this.zGyro].join(',') + '\n',
              directory: Directory.Documents,
              encoding: Encoding.UTF8,
            });
          })
        }
      )
    }
  }

  private getFilePrefix(): string {
    const date = new Date();
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDay() + 1}-`
  }

  public getDuration(): number {
    if (!this.testStartDate) { return 0; }
    return new Date().getTime() - this.testStartDate.getTime();
  }

}
