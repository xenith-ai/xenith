import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'instanceOf',
  standalone: true
})
export class InstanceOfPipe implements PipeTransform {
  transform(value: any, target: any): boolean {
    return value instanceof target;
  }
}
