import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Reference, UpdateReferenceRequest } from '../../core/models/reference.model';
import { formatTags, parseTags } from '../../core/utils/tags.util';

@Component({
  selector: 'app-reference-edit-form',
  imports: [FormsModule],
  templateUrl: './reference-edit-form.html',
  styleUrl: './reference-edit-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferenceEditForm {
  readonly reference = input.required<Reference>();
  readonly saving = input(false);

  readonly saved = output<UpdateReferenceRequest>();
  readonly cancelled = output<void>();

  readonly url = linkedSignal(() => this.reference().url);
  readonly title = linkedSignal(() => this.reference().title);
  readonly tags = linkedSignal(() => formatTags(this.reference().tags));

  submit(): void {
    const url = this.url().trim();
    if (!url) {
      return;
    }

    this.saved.emit({ url, title: this.title().trim(), tags: parseTags(this.tags()) });
  }
}
