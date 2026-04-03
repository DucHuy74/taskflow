package com.xxxx.ddd.application.mapper;

import com.xxxx.ddd.application.model.dto.request.RoleRequest;
import com.xxxx.ddd.application.model.dto.response.PermissionResponse;
import com.xxxx.ddd.application.model.dto.response.RoleResponse;
import com.xxxx.ddd.domain.model.entity.Permission;
import com.xxxx.ddd.domain.model.entity.Role;
import java.util.LinkedHashSet;
import java.util.Set;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-01-07T23:18:02+0700",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.45.0.v20260101-2150, environment: Java 21.0.9 (Eclipse Adoptium)"
)
@Component
public class RoleMapperImpl implements RoleMapper {

    @Override
    public Role toRole(RoleRequest request) {
        if ( request == null ) {
            return null;
        }

        Role.RoleBuilder role = Role.builder();

        role.name( request.getName() );
        role.description( request.getDescription() );

        return role.build();
    }

    @Override
    public RoleResponse toRoleResponse(Role role) {
        if ( role == null ) {
            return null;
        }

        RoleResponse roleResponse = new RoleResponse();

        roleResponse.setDescription( role.getDescription() );
        roleResponse.setName( role.getName() );
        roleResponse.setPermissions( permissionSetToPermissionResponseSet( role.getPermissions() ) );

        return roleResponse;
    }

    protected PermissionResponse permissionToPermissionResponse(Permission permission) {
        if ( permission == null ) {
            return null;
        }

        PermissionResponse permissionResponse = new PermissionResponse();

        permissionResponse.setDescription( permission.getDescription() );
        permissionResponse.setName( permission.getName() );

        return permissionResponse;
    }

    protected Set<PermissionResponse> permissionSetToPermissionResponseSet(Set<Permission> set) {
        if ( set == null ) {
            return null;
        }

        Set<PermissionResponse> set1 = new LinkedHashSet<PermissionResponse>( Math.max( (int) ( set.size() / .75f ) + 1, 16 ) );
        for ( Permission permission : set ) {
            set1.add( permissionToPermissionResponse( permission ) );
        }

        return set1;
    }
}
