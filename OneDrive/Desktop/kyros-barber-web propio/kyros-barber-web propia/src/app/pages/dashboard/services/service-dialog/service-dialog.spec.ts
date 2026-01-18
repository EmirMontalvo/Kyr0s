import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceDialog } from './service-dialog';

describe('ServiceDialog', () => {
  let component: ServiceDialog;
  let fixture: ComponentFixture<ServiceDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
