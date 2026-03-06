import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RenewSubscription } from './renew-subscription';

describe('RenewSubscription', () => {
  let component: RenewSubscription;
  let fixture: ComponentFixture<RenewSubscription>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RenewSubscription]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RenewSubscription);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
