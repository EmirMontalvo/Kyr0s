import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'markdown',
    standalone: true
})
export class MarkdownPipe implements PipeTransform {
    transform(value: string): string {
        if (!value) return '';

        // Bold: **text**
        value = value.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Line breaks
        value = value.replace(/\n/g, '<br>');

        return value;
    }
}
