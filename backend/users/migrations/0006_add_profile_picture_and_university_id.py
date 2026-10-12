# Generated migration to add missing profile_picture and university_id fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_department_user_created_at_user_phone_number_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='profile_picture',
            field=models.ImageField(
                blank=True,
                help_text='Upload your profile picture',
                null=True,
                upload_to='profile_pictures/'
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='university_id',
            field=models.CharField(
                blank=True,
                help_text='University ID number',
                max_length=50,
                null=True,
                unique=True
            ),
        ),
        # Update role choices to include STUDENT
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('ADMIN', 'Admin'),
                    ('PROPERTY_OFFICER', 'Property Officer'),
                    ('DEPT_HEAD', 'Department Head'),
                    ('SECURITY', 'Security Officer'),
                    ('STAFF', 'Staff'),
                    ('USER', 'User'),
                    ('STUDENT', 'Student')
                ],
                default='USER',
                max_length=30
            ),
        ),
    ]
