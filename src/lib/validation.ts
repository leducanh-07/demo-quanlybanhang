import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tên đăng nhập").max(50),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const clockToggleSchema = z.object({
  employeeId: z.number().int().positive("ID nhân viên không hợp lệ"),
});

export const startDayItemSchema = z.object({
  itemId: z.number().int().positive(),
  importQty: z.number().int().min(0, "Số lượng nhập ban đầu không được âm"),
});

export const startDaySchema = z.object({
  items: z.array(startDayItemSchema).min(1, "Cần có ít nhất một món để bắt đầu ngày"),
});

export const adjustStockSchema = z.object({
  itemId: z.number().int().positive(),
  qty: z.number().int().positive("Số lượng phải lớn hơn 0"),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày bán không hợp lệ"),
});

export const recordCountSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        countedQty: z.number().int().min(0, "Số lượng kiểm kê không được âm"),
      })
    )
    .min(1, "Vui lòng kiểm kê ít nhất một món"),
});

export const closeDayItemSchema = z.object({
  itemId: z.number().int().positive(),
  endingQty: z.number().int().min(0, "Số lượng tồn cuối ngày không được âm"),
});

export const closeDaySchema = z.object({
  cashCounted: z.number().int().min(0, "Tiền mặt kiểm đếm không được âm"),
  items: z.array(closeDayItemSchema).min(1, "Thiếu danh sách món chốt ngày"),
});

export const employeeFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Mã nhân viên không được để trống")
    .max(20, "Mã nhân viên tối đa 20 ký tự")
    .regex(/^[a-zA-Z0-9_-]+$/, "Mã nhân viên chỉ chứa chữ cái, số, gạch ngang/dưới"),
  fullName: z.string().trim().min(1, "Họ tên không được để trống").max(100),
  isActive: z.boolean().default(true),
});

const activeStatusSchema = z
  .union([z.boolean(), z.literal(0), z.literal(1)])
  .transform((value) => value === true || value === 1);

export const itemFormSchema = z
  .object({
    name: z.string().trim().min(1, "Tên món không được để trống").max(100),
    unitPrice: z.number().int().min(0, "Đơn giá không được âm"),
    imageUrl: z.string().trim().max(500).nullable().optional(),
    isActive: activeStatusSchema.optional(),
    is_active: activeStatusSchema.optional(),
  })
  .transform(({ isActive, is_active, ...item }) => ({
    ...item,
    isActive: isActive ?? is_active ?? false,
  }));

export const shiftTimeEditSchema = z.object({
  checkInTime: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, "Thời gian vào không đúng định dạng YYYY-MM-DD HH:MM:SS"),
  checkOutTime: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, "Thời gian ra không đúng định dạng YYYY-MM-DD HH:MM:SS")
    .nullable()
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  newPassword: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự"),
});

export const resetManagerPasswordSchema = z.object({
  username: z.string().trim().min(1, "Vui lòng nhập tên đăng nhập").max(50),
  newPassword: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự"),
});
